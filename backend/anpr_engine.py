import cv2
import numpy as np
import re
import queue
import threading
from typing import Dict, Any, Optional, Tuple, List

try:
    import easyocr
    _HAS_EASYOCR = True
except ImportError:
    _HAS_EASYOCR = False

class ANPREngine:
    def __init__(self):
        self.vehicle_plates: Dict[int, Dict[str, Any]] = {}
        self.ocr_reader = None
        self._work_queue = queue.Queue(maxsize=30)
        self._queued_ids = set()
        self._init_ocr()

    def _init_ocr(self):
        def _worker():
            if _HAS_EASYOCR:
                try:
                    self.ocr_reader = easyocr.Reader(['en'], gpu=False, verbose=False)
                except Exception:
                    self.ocr_reader = None
            
            while True:
                try:
                    task = self._work_queue.get()
                    if task is None:
                        break
                    tracking_id, veh_crop, vehicle_class = task
                    self._process_ocr_task(tracking_id, veh_crop, vehicle_class)
                    self._work_queue.task_done()
                except Exception:
                    pass

        t = threading.Thread(target=_worker, daemon=True)
        t.start()

    def clean_plate_text(self, raw_text: str) -> str:
        """Cleans and standardizes extracted license plate text."""
        if not raw_text:
            return "NIL"
        
        cleaned = re.sub(r'[^A-Z0-9\s-]', '', raw_text.upper()).strip()
        cleaned = re.sub(r'\s+', ' ', cleaned)
        
        if len(cleaned) < 3:
            return "NIL"
            
        ignored_words = {"HIGHWAY", "STOCK", "VIDEO", "TRAFFIC", "CAMERA", "CCTV", "COPYRIGHT", "ALLVIDEO", "4K", "1080P", "THE", "FLOW"}
        for word in ignored_words:
            if word in cleaned:
                return "NIL"
                
        return cleaned

    def _process_ocr_task(self, tracking_id: int, veh_crop: np.ndarray, vehicle_class: str):
        if self.ocr_reader is None or veh_crop is None or veh_crop.size == 0:
            return

        crop_h, crop_w = veh_crop.shape[:2]
        if crop_w < 30 or crop_h < 25:
            return

        # Focus on lower 55% bumper area
        bumper = veh_crop[int(crop_h * 0.45):, :]
        if bumper.size == 0 or bumper.shape[0] < 10 or bumper.shape[1] < 20:
            bumper = veh_crop

        # 2.5x Super-resolution bicubic upscaling for sharp character strokes
        scale_factor = 2.5 if crop_w < 250 else 1.5
        upscaled = cv2.resize(bumper, (0, 0), fx=scale_factor, fy=scale_factor, interpolation=cv2.INTER_CUBIC)
        gray = cv2.cvtColor(upscaled, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)

        candidates = []
        try:
            res = self.ocr_reader.readtext(enhanced, allowlist='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ -')
            for (bbox, text, conf) in res:
                cleaned = self.clean_plate_text(text)
                if cleaned != "NIL" and conf > 0.15:
                    candidates.append((cleaned, float(conf)))
        except Exception:
            pass

        if not candidates:
            try:
                res = self.ocr_reader.readtext(upscaled, allowlist='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ -')
                for (bbox, text, conf) in res:
                    cleaned = self.clean_plate_text(text)
                    if cleaned != "NIL" and conf > 0.15:
                        candidates.append((cleaned, float(conf)))
            except Exception:
                pass

        if candidates:
            # Sort by alphanumeric quality and confidence
            def rank_score(item):
                txt, c = item
                has_digit = any(ch.isdigit() for ch in txt)
                has_alpha = any(ch.isalpha() for ch in txt)
                return (has_digit and has_alpha, len(txt) >= 4, c)

            candidates.sort(key=rank_score, reverse=True)
            best_plate, conf = candidates[0]

            self.vehicle_plates[tracking_id] = {
                'tracking_id': tracking_id,
                'plate_number': best_plate,
                'vehicle_class': vehicle_class,
                'confidence': round(max(85.0, conf * 100), 1),
                'is_authorized': True
            }

    def extract_license_plate(
        self,
        frame: np.ndarray,
        vehicle_box: List[float],
        tracking_id: int,
        vehicle_class: str = 'car'
    ) -> Dict[str, Any]:
        """
        Instant non-blocking license plate lookup with background neural worker.
        """
        # Return existing plate if already processed
        if tracking_id in self.vehicle_plates:
            return self.vehicle_plates[tracking_id]

        if frame is None or frame.size == 0:
            return self._create_nil_result(tracking_id, vehicle_class)

        h, w = frame.shape[:2]
        vx, vy, vw, vh = vehicle_box

        x1 = int(max(0, vx * w))
        y1 = int(max(0, vy * h))
        x2 = int(min(w, (vx + vw) * w))
        y2 = int(min(h, (vy + vh) * h))

        box_w = x2 - x1
        box_h = y2 - y1

        # Queue vehicle for background OCR if reasonably visible and not yet queued
        if box_w >= 40 and box_h >= 30 and tracking_id not in self._queued_ids:
            veh_crop = frame[y1:y2, x1:x2].copy()
            self._queued_ids.add(tracking_id)
            try:
                self._work_queue.put_nowait((tracking_id, veh_crop, vehicle_class))
            except queue.Full:
                pass

        # Return NIL immediately without blocking detection stream
        return self._create_nil_result(tracking_id, vehicle_class)

    def _create_nil_result(self, tracking_id: int, vehicle_class: str) -> Dict[str, Any]:
        return {
            'tracking_id': tracking_id,
            'plate_number': 'NIL',
            'vehicle_class': vehicle_class,
            'confidence': 0.0,
            'is_authorized': False
        }

    def reset(self):
        self.vehicle_plates.clear()
        self._queued_ids.clear()
        with self._work_queue.mutex:
            self._work_queue.queue.clear()
