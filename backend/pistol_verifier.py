import os
import math
from collections import deque
from dataclasses import dataclass, field
from typing import List, Optional, Tuple, Dict, Any
import numpy as np
import cv2

try:
    from ultralytics import YOLO
    _HAS_ULTRALYTICS = True
except ImportError:
    _HAS_ULTRALYTICS = False

try:
    import mediapipe as mp
    _HAS_MEDIAPIPE = True
except ImportError:
    _HAS_MEDIAPIPE = False

PISTOL_CLASS_NAMES = {'pistol', 'gun', 'handgun', 'revolver', 'firearm', 'weapon', 'knife', 'machete'}
PISTOL_ASPECT_RATIO_RANGE = (0.7, 3.2)
PISTOL_MIN_AREA_FRACTION = 0.0003
PISTOL_MAX_AREA_FRACTION = 0.35

@dataclass
class DetectorConfig:
    model_path: str = ''
    conf_threshold: float = 0.18
    iou_threshold_nms: float = 0.45
    confirm_frames: int = 2
    max_missed_frames: int = 8
    track_iou_threshold: float = 0.25
    require_hand_nearby: bool = False
    hand_search_expand: float = 2.2
    grip_score_threshold: float = 0.30
    geometry_weight: float = 0.25
    grip_weight: float = 0.25
    yolo_weight: float = 0.50
    final_alert_score_threshold: float = 0.35
    device: str = ''

@dataclass
class RawDetection:
    x1: float
    y1: float
    x2: float
    y2: float
    conf: float
    cls_name: str

    @property
    def width(self) -> float:
        return max(0.0, self.x2 - self.x1)

    @property
    def height(self) -> float:
        return max(0.0, self.y2 - self.y1)

    @property
    def area(self) -> float:
        return self.width * self.height

    @property
    def center(self) -> Tuple[float, float]:
        return ((self.x1 + self.x2) / 2.0, (self.y1 + self.y2) / 2.0)

    def as_box(self) -> Tuple[float, float, float, float]:
        return (self.x1, self.y1, self.x2, self.y2)

def _bell_curve(x: float, center: float, width: float) -> float:
    return math.exp(-((x - center) ** 2) / (2 * width ** 2))

def geometry_score(det: RawDetection, frame_shape: Tuple[int, int]) -> float:
    h, w = frame_shape[:2]
    frame_area = float(h * w)
    if frame_area <= 0 or det.height <= 0:
        return 0.5

    area_frac = det.area / frame_area
    aspect = det.width / max(1.0, det.height)

    if area_frac < PISTOL_MIN_AREA_FRACTION or area_frac > PISTOL_MAX_AREA_FRACTION:
        area_score = 0.3
    else:
        lo, hi = PISTOL_MIN_AREA_FRACTION, PISTOL_MAX_AREA_FRACTION
        mid = (lo + hi) / 2.0
        area_score = _bell_curve(area_frac, center=mid, width=(hi - lo) / 2.0)

    lo_ar, hi_ar = PISTOL_ASPECT_RATIO_RANGE
    if lo_ar <= aspect <= hi_ar:
        ar_score = 1.0
    else:
        dist = min(abs(aspect - lo_ar), abs(aspect - hi_ar))
        ar_score = max(0.2, 1.0 - dist / 2.0)

    return float(np.clip(0.5 * area_score + 0.5 * ar_score, 0.1, 1.0))

class GripValidator:
    def __init__(self, cfg: DetectorConfig):
        self.cfg = cfg
        self._hands = None
        if _HAS_MEDIAPIPE:
            try:
                self._hands = mp.solutions.hands.Hands(
                    static_image_mode=False,
                    max_num_hands=4,
                    min_detection_confidence=0.4,
                    min_tracking_confidence=0.4,
                )
            except Exception:
                self._hands = None

    def available(self) -> bool:
        return self._hands is not None

    def evaluate(self, frame_rgb: np.ndarray, det: RawDetection) -> Tuple[bool, float]:
        if self._hands is None:
            return True, 0.7

        h, w = frame_rgb.shape[:2]
        try:
            results = self._hands.process(frame_rgb)
        except Exception:
            return True, 0.7

        if not results or not results.multi_hand_landmarks:
            return False, 0.4

        cx, cy = det.center
        half_w = (det.width * self.cfg.hand_search_expand) / 2.0
        half_h = (det.height * self.cfg.hand_search_expand) / 2.0
        search_box = (cx - half_w, cy - half_h, cx + half_w, cy + half_h)

        best_score = 0.4
        found_hand = False

        for hand_landmarks in results.multi_hand_landmarks:
            pts = np.array([(lm.x * w, lm.y * h) for lm in hand_landmarks.landmark])
            hand_cx, hand_cy = pts[:, 0].mean(), pts[:, 1].mean()
            if search_box[0] <= hand_cx <= search_box[2] and search_box[1] <= hand_cy <= search_box[3]:
                found_hand = True
                score = self._grip_shape_score(pts)
                best_score = max(best_score, score)

        return found_hand, best_score

    @staticmethod
    def _grip_shape_score(pts: np.ndarray) -> float:
        wrist = pts[0]
        def curl_ratio(tip_idx, pip_idx, mcp_idx):
            tip, mcp = pts[tip_idx], pts[mcp_idx]
            d_tip = np.linalg.norm(tip - wrist)
            d_mcp = np.linalg.norm(mcp - wrist) + 1e-6
            return d_tip / d_mcp

        finger_defs = [(8, 6, 5), (12, 10, 9), (16, 14, 13), (20, 18, 17)]
        ratios = [curl_ratio(tip, pip, mcp) for tip, pip, mcp in finger_defs]
        avg_ratio = float(np.mean(ratios))
        curl_score = _bell_curve(avg_ratio, center=1.15, width=0.45)

        thumb_tip, index_mcp = pts[4], pts[5]
        thumb_to_index = np.linalg.norm(thumb_tip - index_mcp)
        hand_scale = np.linalg.norm(pts[5] - pts[17]) + 1e-6
        thumb_ratio = thumb_to_index / hand_scale
        thumb_score = _bell_curve(thumb_ratio, center=0.9, width=0.7)

        combined = 0.65 * curl_score + 0.35 * thumb_score
        return float(np.clip(combined, 0.1, 1.0))

    def close(self):
        if self._hands is not None:
            try:
                self._hands.close()
            except Exception:
                pass

@dataclass
class Track:
    track_id: int
    box: Tuple[float, float, float, float]
    cls_name: str = 'weapon'
    hit_streak: int = 0
    miss_streak: int = 0
    confirmed: bool = False
    score_history: deque = field(default_factory=lambda: deque(maxlen=15))
    first_seen_frame: int = 0
    last_seen_frame: int = 0

    def update(self, box, composite_score, frame_idx, cls_name='weapon'):
        self.box = box
        self.cls_name = cls_name
        self.hit_streak += 1
        self.miss_streak = 0
        self.score_history.append(composite_score)
        self.last_seen_frame = frame_idx

    def mark_missed(self):
        self.miss_streak += 1
        self.hit_streak = 0

    @property
    def avg_score(self) -> float:
        return float(np.mean(self.score_history)) if self.score_history else 0.0

def iou(box_a, box_b) -> float:
    ax1, ay1, ax2, ay2 = box_a
    bx1, by1, bx2, by2 = box_b
    ix1, iy1 = max(ax1, bx1), max(ay1, by1)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    iw, ih = max(0.0, ix2 - ix1), max(0.0, iy2 - iy1)
    inter = iw * ih
    area_a = max(0.0, ax2 - ax1) * max(0.0, ay2 - ay1)
    area_b = max(0.0, bx2 - bx1) * max(0.0, by2 - by1)
    union = area_a + area_b - inter
    return inter / union if union > 0 else 0.0

class ConfirmationTracker:
    def __init__(self, cfg: DetectorConfig):
        self.cfg = cfg
        self.tracks: List[Track] = []
        self._next_id = 101
        self.frame_idx = 0

    def step(self, detections: List[Tuple[Tuple[float, float, float, float], float, str]]):
        self.frame_idx += 1
        unmatched_dets = list(range(len(detections)))
        matched_track_ids = set()

        for track in self.tracks:
            best_iou, best_j = 0.0, -1
            for j in unmatched_dets:
                box, score, cls_name = detections[j]
                i = iou(track.box, box)
                if i > best_iou:
                    best_iou, best_j = i, j
            if best_iou >= self.cfg.track_iou_threshold and best_j != -1:
                box, score, cls_name = detections[best_j]
                track.update(box, score, self.frame_idx, cls_name)
                unmatched_dets.remove(best_j)
                matched_track_ids.add(track.track_id)

        for track in self.tracks:
            if track.track_id not in matched_track_ids:
                track.mark_missed()

        for j in unmatched_dets:
            box, score, cls_name = detections[j]
            t = Track(track_id=self._next_id, box=box, cls_name=cls_name,
                      first_seen_frame=self.frame_idx, last_seen_frame=self.frame_idx)
            t.update(box, score, self.frame_idx, cls_name)
            self.tracks.append(t)
            self._next_id += 1

        self.tracks = [t for t in self.tracks if t.miss_streak <= self.cfg.max_missed_frames]

        confirmed = []
        for t in self.tracks:
            if (not t.confirmed) and t.hit_streak >= self.cfg.confirm_frames and t.avg_score >= self.cfg.final_alert_score_threshold:
                t.confirmed = True
            if t.confirmed and t.miss_streak == 0:
                confirmed.append(t)
        return confirmed

class MultiStagePistolPipeline:
    def __init__(self, model_path: str = None):
        if not model_path or not os.path.exists(model_path):
            base_dir = os.path.dirname(__file__)
            cand = os.path.join(base_dir, 'models', 'best.pt')
            model_path = cand if os.path.exists(cand) else os.path.join(base_dir, 'yolov8n.pt')

        self.cfg = DetectorConfig(model_path=model_path)
        self.detector = None
        if os.path.exists(model_path):
            try:
                self.detector = YOLO(model_path)
                print(f'[MultiStagePistolPipeline] Initialized with model: {model_path}')
            except Exception as e:
                print(f'[MultiStagePistolPipeline] YOLO init error: {e}')

        self.grip_validator = GripValidator(self.cfg)
        self.tracker = ConfirmationTracker(self.cfg)

    def process_frame_detections(self, frame_bgr: np.ndarray, width: int, height: int, timestamp: float, frame_idx: int) -> List[Dict[str, Any]]:
        if self.detector is None:
            return []

        raw_dets = []
        try:
            results = self.detector(frame_bgr, conf=self.cfg.conf_threshold, verbose=False)
            if results and len(results) > 0 and results[0].boxes is not None:
                for box in results[0].boxes:
                    cls_id = int(box.cls[0].item())
                    cls_name = str(self.detector.names.get(cls_id, '')).lower()
                    conf = float(box.conf[0].item())
                    
                    if cls_id == 1 or cls_name in PISTOL_CLASS_NAMES or any(w in cls_name for w in ['gun', 'knife', 'pistol', 'firearm', 'weapon', 'machete']):
                        x1, y1, x2, y2 = [float(v) for v in box.xyxy[0].tolist()]
                        raw_dets.append(RawDetection(x1, y1, x2, y2, conf, cls_name if cls_name else 'pistol'))
        except Exception as e:
            pass

        frame_rgb = None
        if raw_dets and self.grip_validator.available():
            try:
                frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
            except Exception:
                pass

        gated_for_tracker = []
        for det in raw_dets:
            hand_present, grip_score = (True, 0.7)
            if self.cfg.require_hand_nearby and frame_rgb is not None:
                hand_present, grip_score = self.grip_validator.evaluate(frame_rgb, det)

            geo_score = geometry_score(det, (height, width))

            if self.cfg.require_hand_nearby and not hand_present:
                continue

            composite = (
                self.cfg.yolo_weight * det.conf +
                self.cfg.grip_weight * grip_score +
                self.cfg.geometry_weight * geo_score
            )

            if composite >= self.cfg.final_alert_score_threshold:
                gated_for_tracker.append((det.as_box(), composite, det.cls_name))

        confirmed_tracks = self.tracker.step(gated_for_tracker)

        weapon_objects = []
        for t in confirmed_tracks:
            x1, y1, x2, y2 = t.box
            norm_box = [
                round(max(0.0, float(x1 / width)), 4),
                round(max(0.0, float(y1 / height)), 4),
                round(min(1.0, float((x2 - x1) / width)), 4),
                round(min(1.0, float((y2 - y1) / height)), 4)
            ]
            conf_pct = round(t.avg_score * 100, 1)
            display_title = 'PISTOL' if 'pistol' in t.cls_name or 'gun' in t.cls_name else t.cls_name.upper()
            
            weapon_objects.append({
                'class': 'weapon',
                'label': f'[WEAPON] {display_title} #{t.track_id}',
                'confidence': conf_pct,
                'tracking_id': t.track_id,
                'bbox': norm_box,
                'in_restricted_zone': False,
                'color': '#ef4444',
                'is_confirmed_weapon': True
            })

        return weapon_objects

    def close(self):
        self.grip_validator.close()
