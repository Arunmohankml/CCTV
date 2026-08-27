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
            "path": os.path.join(VIDEOS_DIR, "stock-footage-cctv-records-how-masked-thiefs-in-balaclava-is-going-to-steal-and-rob-the-house.webm")
        },
        {
            "id": "video-cat-burglar",
            "title": "🥷 Cat Burglar After-Hours Intrusion CCTV",
            "category": "Facility Intrusion & Theft",
            "description": "Surveillance footage of unauthorized intruder sneaking into commercial shopping center after hours.",
            "path": os.path.join(VIDEOS_DIR, "stock-footage-surveillance-security-camera-footage-of-a-cat-burglar-sneaking-into-the-shopping-center-after-hours.webm")
        },
        {
            "id": "video-military-running",
            "title": "🏃 Sprinting & Fleeing Suspects CCTV",
            "category": "Suspect Pursuit & Running",
            "description": "High-speed kinematic velocity camera detecting rapid sprinting and fleeing suspects.",
            "path": os.path.join(VIDEOS_DIR, "Two_people_running_in_military_202608270710.mp4")
        },
        {
            "id": "video-military-convoy",
            "title": "🎖️ Military Convoy & Vehicle Perimeter",
            "category": "Perimeter & Vehicle Security",
            "description": "Restricted military corridor camera monitoring convoy vehicles and passing traffic.",
            "path": os.path.join(VIDEOS_DIR, "Car_passing_military_vehicles_hi._202608270720.mp4")
        },
        {
            "id": "video-five-thieves",
            "title": "Five Suspects / Theft CCTV Feed",
            "category": "Security Breach & Theft",
            "description": "Perimeter camera detecting multiple unauthorized individuals and intrusion activity.",
            "path": os.path.join(VIDEOS_DIR, "vidssave.com five Thief Caught on CCTV camera 720P.mp4")
        },
        {
            "id": "video-security-alpha",
            "title": "📹 High-Security Sector Alpha Feed",
            "category": "Facility Security",
            "description": "Direct surveillance camera monitoring high-priority access zone.",
            "path": os.path.join(VIDEOS_DIR, "WhatsApp Video 2026-08-27 at 7.32.51 AM.mp4")
        },
        {
            "id": "video-security-bravo",
            "title": "📹 High-Security Sector Bravo Feed",
            "category": "Facility Security",
            "description": "Direct surveillance camera monitoring perimeter gateway corridor.",
            "path": os.path.join(VIDEOS_DIR, "WhatsApp Video 2026-08-27 at 7.32.55 AM.mp4")
        },
        {
            "id": "video-security-charlie",
            "title": "📹 High-Security Sector Charlie Feed",
            "category": "Facility Security",
            "description": "Direct surveillance camera observing building entry sector.",
            "path": os.path.join(VIDEOS_DIR, "WhatsApp Video 2026-08-27 at 7.32.57 AM.mp4")
        },
        {
            "id": "video-highway-traffic",
            "title": "Highway Traffic Flow & Multi-Lane ANPR",
            "category": "Highway & Traffic Surveillance",
            "description": "Ultra-HD 1080p60 multi-lane highway surveillance feed tracking vehicle flow and license plates.",
            "path": os.path.join(VIDEOS_DIR, "vidssave.com Traffic Flow In The Highway - 4K Stock Videos _ NoCopyright _ AllVideoFree 1080p60.mp4")
        },
        {
            "id": "video-solapur",
            "title": "Solapur Traffic & Incident CCTV",
            "category": "Traffic & Incident",
            "description": "City intersection surveillance camera monitoring vehicle collision risks.",
            "path": os.path.join(VIDEOS_DIR, "vidssave.com accident CCTV camera capture @solapur 480p.mp4")
        },
        {
            "id": "video-kerala-machete",
            "title": "Kerala Machete Incident CCTV",
            "category": "Armed Incident",
            "description": "Public surveillance feed capturing armed perpetrator confrontation.",
            "path": os.path.join(VIDEOS_DIR, "vidssave.com This Kerala policeman’s bravery went viral on the internet as he subdued a man wielding a machete 720P.mp4")
        }
    ]

    added_paths = set()

    for sample in known_samples:
        if os.path.exists(sample["path"]):
            size_mb = round(os.path.getsize(sample["path"]) / (1024 * 1024), 2)
            samples.append({
                "id": sample["id"],
                "title": sample["title"],
                "category": sample["category"],
                "description": sample["description"],
                "file_path": sample["path"],
                "size_mb": size_mb,
                "is_sample": True
            })
            added_paths.add(os.path.abspath(sample["path"]))

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
