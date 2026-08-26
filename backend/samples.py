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
        },
        {
            "id": "video-five-thieves",
            "title": "Five Suspects / Theft CCTV Feed",
            "category": "Security Breach & Theft",
            "description": "Perimeter camera detecting multiple unauthorized individuals and intrusion activity.",
            "path": os.path.join(VIDEOS_DIR, "vidssave.com five Thief Caught on CCTV camera 720P.mp4")
        },
        {
            "id": "sample-cctv-01",
            "title": "Restricted Zone CCTV Footage",
            "category": "Perimeter Intrusion",
            "description": "High-definition surveillance feed monitoring building entryway & parking corridor.",
            "path": os.path.join(REFERENCE_DIR, "person_detection_from_cctv_video-master", "person_detection_from_cctv_video-master", "cctv.mp4")
        },
        {
            "id": "sample-cctv-02",
            "title": "Street & Pedestrian Feed",
            "category": "Public Surveillance",
            "description": "City CCTV feed tracking pedestrian & vehicle movement.",
            "path": os.path.join(REFERENCE_DIR, "person_detection_from_cctv_video-master", "person_detection_from_cctv_video-master", "test_video.mp4")
        },
        {
            "id": "sample-cctv-03",
            "title": "Security Camera Feed #1",
            "category": "Facility Security",
            "description": "Indoor security camera observing corridor access zone.",
            "path": os.path.join(REFERENCE_DIR, "Detection-of-pistol-by-deep-learning-With-YOLO_v5-main", "Detection-of-pistol-by-deep-learning-With-YOLO_v5-main", "Test Video", "Test video_1.mp4")
        },
        {
            "id": "sample-cctv-04",
            "title": "Security Camera Feed #2",
            "category": "Facility Security",
            "description": "High-risk entrance surveillance feed.",
            "path": os.path.join(REFERENCE_DIR, "Detection-of-pistol-by-deep-learning-With-YOLO_v5-main", "Detection-of-pistol-by-deep-learning-With-YOLO_v5-main", "Test Video", "Test video_3.mp4")
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
                    samples.append({
                        "id": vid_id,
                        "title": fname.replace(".mp4", "").replace(".webm", "").replace("_", " ").title(),
                        "category": "Uploaded CCTV",
                        "description": f"Custom surveillance video file ({size_mb} MB)",
                        "file_path": full_p,
                        "size_mb": size_mb,
                        "is_sample": True
                    })
                    added_paths.add(full_p)

    return samples
