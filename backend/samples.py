import os
import glob
from typing import List, Dict

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
REFERENCE_DIR = os.path.join(PROJECT_ROOT, "refrence")
VIDEOS_DIR = os.path.join(PROJECT_ROOT, "videos")

def discover_sample_videos() -> List[Dict[str, str]]:
    """
    Scans the videos/ and refrence/ directories for available CCTV videos.
    """
    samples = []
    
    # Predefined known sample videos with friendly titles & metadata
    known_samples = [
        {
            "id": "video-masked-thieves",
            "title": "🎭 Masked Thieves in Balaclavas CCTV",
            "category": "Suspicious Activity & Mask Detection",
            "description": "Perimeter camera detecting masked perpetrators in balaclavas attempting residential burglary.",
            "pattern": "masked-thiefs"
        },
        {
            "id": "video-cat-burglar",
            "title": "🥷 Cat Burglar After-Hours Intrusion CCTV",
            "category": "Facility Intrusion & Theft",
            "description": "Surveillance footage of unauthorized intruder sneaking into commercial shopping center after hours.",
            "pattern": "cat-burglar"
        },
        {
            "id": "video-military-running",
            "title": "🏃 Sprinting & Fleeing Suspects CCTV",
            "category": "Suspect Pursuit & Running",
            "description": "High-speed kinematic velocity camera detecting rapid sprinting and fleeing suspects.",
            "pattern": "Two_people_running"
        },
        {
            "id": "video-military-convoy",
            "title": "🎖️ Military Convoy & Vehicle Perimeter",
            "category": "Perimeter & Vehicle Security",
            "description": "Restricted military corridor camera monitoring convoy vehicles and passing traffic.",
            "pattern": "Car_passing_military"
        },
        {
            "id": "video-five-thieves",
            "title": "Five Suspects / Theft CCTV Feed",
            "category": "Security Breach & Theft",
            "description": "Perimeter camera detecting multiple unauthorized individuals and intrusion activity.",
            "pattern": "five Thief Caught"
        },
        {
            "id": "video-security-alpha",
            "title": "📹 High-Security Sector Alpha Feed",
            "category": "Facility Security",
            "description": "Direct surveillance camera monitoring high-priority access zone.",
            "pattern": "7.32.51"
        },
        {
            "id": "video-security-bravo",
            "title": "📹 High-Security Sector Bravo Feed",
            "category": "Facility Security",
            "description": "Direct surveillance camera monitoring perimeter gateway corridor.",
            "pattern": "7.32.55"
        },
        {
            "id": "video-security-charlie",
            "title": "📹 High-Security Sector Charlie Feed",
            "category": "Facility Security",
            "description": "Direct surveillance camera observing building entry sector.",
            "pattern": "7.32.57"
        }
    ]

    added_paths = set()

    for sample in known_samples:
        matched_file = None
        pattern = sample.get("pattern", "")
        if os.path.exists(VIDEOS_DIR):
            for fname in os.listdir(VIDEOS_DIR):
                if pattern and pattern.lower() in fname.lower():
                    matched_file = os.path.abspath(os.path.join(VIDEOS_DIR, fname))
                    break

        if matched_file and os.path.exists(matched_file):
            size_mb = round(os.path.getsize(matched_file) / (1024 * 1024), 2)
            samples.append({
                "id": sample["id"],
                "title": sample["title"],
                "category": sample["category"],
                "description": sample["description"],
                "file_path": matched_file,
                "size_mb": size_mb,
                "is_sample": True
            })
            added_paths.add(matched_file)

    # Dynamic scan of any additional video files dropped into videos/ directory
    if os.path.exists(VIDEOS_DIR):
        for fname in os.listdir(VIDEOS_DIR):
            if fname.lower().endswith((".mp4", ".webm", ".mov", ".avi", ".mkv")):
                full_p = os.path.abspath(os.path.join(VIDEOS_DIR, fname))
                if full_p not in added_paths:
                    vid_id = "vdir-" + os.path.splitext(fname)[0].replace(" ", "_").lower()
                    size_mb = round(os.path.getsize(full_p) / (1024 * 1024), 2)
                    clean_title = fname.replace(".mp4", "").replace(".webm", "").replace("_", " ").title()
                    samples.append({
                        "id": vid_id,
                        "title": f"📹 {clean_title}",
                        "category": "Uploaded CCTV",
                        "description": f"Custom surveillance video file ({size_mb} MB)",
                        "file_path": full_p,
                        "size_mb": size_mb,
                        "is_sample": True
                    })
                    added_paths.add(full_p)

    return samples
