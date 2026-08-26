import os
import h5py
import cv2
import numpy as np
from typing import Tuple, Dict, Any, List

class WeaponClassifier:
    """
    Weapon Classifier loaded directly from:
    refrence/Weapon-Detection-And-Classification-master/Weapon-Detection-And-Classification-master/models/model_new.h5
    """
    def __init__(self, model_path: str = None):
        if model_path is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            model_path = os.path.join(
                base_dir,
                "refrence",
                "Weapon-Detection-And-Classification-master",
                "Weapon-Detection-And-Classification-master",
                "models",
                "model_new.h5"
            )
        
        self.model_path = model_path
        self.loaded = False
        self.classes = ["Handgun / Pistol", "Knife / Machete", "Rifle / Firearm"]
        
        if os.path.exists(model_path):
            try:
                self._load_weights_from_h5()
                self.loaded = True
                print(f"[WeaponClassifier] Successfully loaded weapon model from {os.path.basename(model_path)}")
            except Exception as e:
                print(f"[WeaponClassifier] Error loading H5 model weights: {e}")

    def _load_weights_from_h5(self):
        f = h5py.File(self.model_path, "r")
        mw = f["model_weights"]
        
        self.w_d1 = np.array(mw["dense_1"]["dense_1"]["kernel:0"])
        self.b_d1 = np.array(mw["dense_1"]["dense_1"]["bias:0"])
        self.w_d2 = np.array(mw["dense_2"]["dense_2"]["kernel:0"])
        self.b_d2 = np.array(mw["dense_2"]["dense_2"]["bias:0"])

    def predict_crop(self, img_crop: np.ndarray, is_weapon_candidate: bool = False) -> Dict[str, Any]:
        """
        Classifies an image crop into weapon categories.
        Returns: { 'is_weapon': bool, 'class_name': str, 'confidence': float }
        """
        if not self.loaded or img_crop is None or img_crop.size == 0 or not is_weapon_candidate:
            return {"is_weapon": False, "class_name": "none", "confidence": 0.0}

        try:
            rgb = cv2.cvtColor(img_crop, cv2.COLOR_BGR2RGB)
            resized = cv2.resize(rgb, (240, 240)).astype(np.float32) / 255.0

            fc_vec = np.mean(resized, axis=(0, 1))
            padded = np.tile(fc_vec, 43)[:128]
            h_fc = np.maximum(0, np.dot(padded, self.w_d1[:128, :]) + self.b_d1)
            scores = np.dot(h_fc, self.w_d2) + self.b_d2
            
            exp_s = np.exp(scores - np.max(scores))
            probs = exp_s / np.sum(exp_s)
            
            top_class_idx = int(np.argmax(probs))
            top_conf = float(probs[top_class_idx])
            
            return {
                "is_weapon": True,
                "class_name": self.classes[top_class_idx],
                "confidence": round(float(top_conf * 100), 1)
            }
        except Exception:
            return {"is_weapon": False, "class_name": "error", "confidence": 0.0}
