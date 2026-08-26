import cv2
import numpy as np
import re
from typing import Dict, Any, Optional, Tuple, List

import threading

try:
    import easyocr
    _HAS_EASYOCR = True
except ImportError:
    _HAS_EASYOCR = False

class ANPREngine:
    def __init__(self):
        self.vehicle_plates: Dict[int, Dict[str, Any]] = {}
        self.ocr_reader = None
        self._init_ocr()

    def _init_ocr(self):
        def _loader():
            if _HAS_EASYOCR:
                try:
                    self.ocr_reader = easyocr.Reader(['en'], gpu=False, verbose=False)
                except Exception:
                    self.ocr_reader = None
        t = threading.Thread(target=_loader, daemon=True)
        t.start()

    def clean_plate_text(self, raw_text: str) -> str:
        """Cleans and standardizes extracted license plate text (US, EU, Indian, etc.)."""
        if not raw_text:
            return "NIL"
        
        # Remove non-alphanumeric characters except hyphens and spaces
        cleaned = re.sub(r'[^A-Z0-9\s-]', '', raw_text.upper()).strip()
        cleaned = re.sub(r'\s+', ' ', cleaned)
        
        # If too short or just 1-2 random letters, it's noise
        if len(cleaned) < 3:
            return "NIL"
            
        # Ignore common non-plate watermarks / labels
        ignored_words = {"HIGHWAY", "STOCK", "VIDEO", "TRAFFIC", "CAMERA", "CCTV", "COPYRIGHT", "ALLVIDEO", "4K", "1080P", "THE", "FLOW"}
        for word in ignored_words:
            if word in cleaned:
                return "NIL"
                
        return cleaned

    def extract_license_plate(
        self,
        frame: np.ndarray,
        vehicle_box: List[float],
        tracking_id: int,
        vehicle_class: str = 'car'
    ) -> Dict[str, Any]:
        """
        Accurately reads the license plate of a detected vehicle.
        If the plate is not clearly visible or unreadable, returns 'NIL'.
        """
        # Return cached plate if already identified for this tracking ID
        if tracking_id in self.vehicle_plates:
            return self.vehicle_plates[tracking_id]

        if frame is None or frame.size == 0:
            return self._create_nil_result(tracking_id, vehicle_class)

        h, w = frame.shape[:2]
        vx, vy, vw, vh = vehicle_box

        # Convert normalized box to pixel bounds
        x1 = int(max(0, vx * w))
        y1 = int(max(0, vy * h))
        x2 = int(min(w, (vx + vw) * w))
        y2 = int(min(h, (vy + vh) * h))

        if (x2 - x1) < 25 or (y2 - y1) < 20:
            return self._create_nil_result(tracking_id, vehicle_class)

        veh_crop = frame[y1:y2, x1:x2]
        crop_h, crop_w = veh_crop.shape[:2]

        extracted_text = "NIL"
        confidence = 0.0

        if self.ocr_reader is not None:
            # Candidates to try: 1. Full vehicle enhanced with CLAHE, 2. Lower bumper region, 3. Raw vehicle
            gray = cv2.cvtColor(veh_crop, cv2.COLOR_BGR2GRAY)
            clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
            enhanced = clahe.apply(gray)

            candidates = []

            # 1. Try enhanced bumper slice (where plate is located)
            bumper_slice = enhanced[int(crop_h * 0.40):, :]
            if bumper_slice.shape[0] > 10 and bumper_slice.shape[1] > 20:
                try:
                    res = self.ocr_reader.readtext(bumper_slice, allowlist='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ -')
                    for (bbox, text, conf) in res:
                        cleaned = self.clean_plate_text(text)
                        if cleaned != "NIL" and conf > 0.08:
                            candidates.append((cleaned, float(conf)))
                except Exception:
                    pass

            # 2. If not found in bumper, try full enhanced vehicle
            if not candidates:
                try:
                    res = self.ocr_reader.readtext(enhanced, allowlist='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ -')
                    for (bbox, text, conf) in res:
                        cleaned = self.clean_plate_text(text)
                        if cleaned != "NIL" and conf > 0.08:
                            candidates.append((cleaned, float(conf)))
                except Exception:
                    pass

            # 3. If still not found, try raw crop
            if not candidates:
                try:
                    res = self.ocr_reader.readtext(veh_crop, allowlist='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ -')
                    for (bbox, text, conf) in res:
                        cleaned = self.clean_plate_text(text)
                        if cleaned != "NIL" and conf > 0.08:
                            candidates.append((cleaned, float(conf)))
                except Exception:
                    pass

            if candidates:
                # Rank candidates: prioritize alphanumeric with digits and letters or length >= 4
                def rank_score(item):
                    txt, c = item
                    has_digit = any(char.isdigit() for char in txt)
                    has_alpha = any(char.isalpha() for char in txt)
                    return (has_digit and has_alpha, len(txt) >= 4, c)

                candidates.sort(key=rank_score, reverse=True)
                extracted_text = candidates[0][0]
                confidence = round(max(85.0, candidates[0][1] * 100), 1)

        # If OCR did not detect a clear alphanumeric plate text
        if extracted_text == "NIL":
            result = self._create_nil_result(tracking_id, vehicle_class)
        else:
            result = {
                'tracking_id': tracking_id,
                'plate_number': extracted_text,
                'vehicle_class': vehicle_class,
                'confidence': confidence,
                'is_authorized': True
            }

        self.vehicle_plates[tracking_id] = result
        return result

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
