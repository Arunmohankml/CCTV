import os
import cv2
import uuid
import json
import asyncio
from typing import Dict, Any, Optional, List
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
from pydantic import BaseModel

from analyzer import VideoAnalyzer
from samples import discover_sample_videos

app = FastAPI(title="AI Surveillance Video Analytics API", version="1.0.0")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directories for uploads & cached analysis results
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STORAGE_DIR = os.path.join(BASE_DIR, "storage")
UPLOADS_DIR = os.path.join(STORAGE_DIR, "uploads")
RESULTS_DIR = os.path.join(STORAGE_DIR, "results")

os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(RESULTS_DIR, exist_ok=True)

# In-memory job state & cached video registry
analyzer_instance = VideoAnalyzer("yolov8n.pt")
analysis_jobs: Dict[str, Dict[str, Any]] = {}
video_registry: Dict[str, str] = {}

class AnalyzeRequest(BaseModel):
    video_id: Optional[str] = None
    sample_id: Optional[str] = None
    restricted_zone: Optional[List[List[float]]] = None
    enable_boundary_check: Optional[bool] = True

def run_analysis_task(analysis_id: str, video_path: str, restricted_zone: Optional[List[List[float]]], enable_boundary_check: bool = True, target_key: Optional[str] = None):
    """
    Background worker that runs YOLO analysis and persists result JSON.
    """
    analysis_jobs[analysis_id]["status"] = "PROCESSING"
    
    zone_tuples = None
    if restricted_zone and len(restricted_zone) >= 3:
        zone_tuples = [(p[0], p[1]) for p in restricted_zone]

    def update_progress(progress: float, current_frame: int, total_frames: int, events_count: int, detections_count: int):
        analysis_jobs[analysis_id].update({
            "progress": progress,
            "current_frame": current_frame,
            "total_frames": total_frames,
            "events_count": events_count,
            "detections_count": detections_count
        })

    try:
        results = analyzer_instance.analyze_video(
            video_path=video_path,
            restricted_zone=zone_tuples,
            sample_step=None,
            progress_callback=update_progress,
            enable_boundary_check=enable_boundary_check
        )
        
        result_file = os.path.join(RESULTS_DIR, f"{analysis_id}.json")
        with open(result_file, "w", encoding="utf-8") as f:
            json.dump(results, f)

        if target_key:
            sample_cache = os.path.join(RESULTS_DIR, f"{target_key}.json")
            with open(sample_cache, "w", encoding="utf-8") as f:
                json.dump(results, f)

        analysis_jobs[analysis_id].update({
            "status": "COMPLETED",
            "progress": 100.0,
            "results": results,
            "result_file": result_file
        })
    except Exception as e:
        analysis_jobs[analysis_id].update({
            "status": "FAILED",
            "error": str(e)
        })

@app.get("/api/health")
def health_check():
    return {"status": "ONLINE", "service": "AI Surveillance Backend", "yolo_model": "YOLOv8n"}

@app.get("/api/samples")
def get_sample_videos():
    samples = discover_sample_videos()
    for s in samples:
        video_registry[s["id"]] = s["file_path"]
    return samples

@app.post("/api/upload")
async def upload_video(file: UploadFile = File(...)):
    """
    Uploads a surveillance video file (MP4/WebM/MOV/AVI).
    """
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".mp4", ".webm", ".mov", ".avi", ".mkv"]:
        raise HTTPException(status_code=400, detail="Unsupported video format. Upload MP4, WebM, MOV, or AVI.")

    video_id = f"vid-{uuid.uuid4().hex[:8]}"
    saved_filename = f"{video_id}{ext}"
    saved_path = os.path.join(UPLOADS_DIR, saved_filename)

    with open(saved_path, "wb") as f:
        content = await file.read()
        f.write(content)

    video_registry[video_id] = saved_path
    size_mb = round(os.path.getsize(saved_path) / (1024 * 1024), 2)

    return {
        "video_id": video_id,
        "filename": file.filename,
        "size_mb": size_mb,
        "path": saved_path
    }

@app.post("/api/analyze")
def start_analysis(req: AnalyzeRequest, background_tasks: BackgroundTasks):
    """
    Starts video analysis or serves cached results instantly (<10ms).
    """
    video_path = None
    target_key = req.sample_id or req.video_id

    if req.sample_id:
        samples = discover_sample_videos()
        for s in samples:
            if s["id"] == req.sample_id:
                video_path = s["file_path"]
                video_registry[req.sample_id] = video_path
                break
    elif req.video_id:
        video_path = video_registry.get(req.video_id)

    if not video_path or not os.path.exists(video_path):
        clean_id = (req.sample_id or req.video_id or "").replace("vdir-", "").replace("video-", "").replace("_", " ").lower()
        if os.path.exists(VIDEOS_DIR):
            for fname in os.listdir(VIDEOS_DIR):
                if clean_id in fname.lower() or fname.lower() in clean_id or any(w in fname.lower() for w in clean_id.split() if len(w) > 3):
                    video_path = os.path.join(VIDEOS_DIR, fname)
                    break

    if not video_path or not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video file not found or invalid video ID.")

    analysis_id = f"anl-{uuid.uuid4().hex[:8]}"

    # INSTANT CACHE CHECK: If pre-analyzed result exists for this sample/video
    cache_file = os.path.join(RESULTS_DIR, f"{target_key}.json")
    if os.path.exists(cache_file):
        try:
            with open(cache_file, "r") as f:
                cached_data = json.load(f)
            
            # Re-evaluate zone if custom zone requested or boundary check toggled
            boundary_enabled = req.enable_boundary_check if req.enable_boundary_check is not None else True
            zone_tuples = [(p[0], p[1]) for p in req.restricted_zone] if req.restricted_zone else None
            cached_data = analyzer_instance.recalculate_zone(cached_data, zone_tuples, enable_boundary_check=boundary_enabled)

            analysis_jobs[analysis_id] = {
                "analysis_id": analysis_id,
                "video_path": video_path,
                "status": "COMPLETED",
                "progress": 100.0,
                "results": cached_data,
                "result_file": cache_file
            }

            return {
                "analysis_id": analysis_id,
                "status": "COMPLETED",
                "message": "Instant live surveillance stream ready."
            }
        except Exception as e:
            pass # Fallback to background processing

    analysis_jobs[analysis_id] = {
        "analysis_id": analysis_id,
        "video_path": video_path,
        "status": "QUEUED",
        "progress": 0.0,
        "current_frame": 0,
        "total_frames": 0,
        "events_count": 0,
        "detections_count": 0,
        "restricted_zone": req.restricted_zone
    }

    background_tasks.add_task(run_analysis_task, analysis_id, video_path, req.restricted_zone, req.enable_boundary_check, target_key)

    return {
        "analysis_id": analysis_id,
        "status": "QUEUED",
        "message": "AI analysis started successfully."
    }

@app.get("/api/analysis/{analysis_id}")
@app.get("/api/analysis/{analysis_id}/status")
def get_analysis_status(analysis_id: str):
    """
    Returns current status and progress of an analysis job.
    """
    job = analysis_jobs.get(analysis_id)
    if not job:
        # Check if result file exists on disk
        result_file = os.path.join(RESULTS_DIR, f"{analysis_id}.json")
        if os.path.exists(result_file):
            return {"analysis_id": analysis_id, "status": "COMPLETED", "progress": 100.0}
        return {"analysis_id": analysis_id, "status": "FAILED", "error": "Job expired or reconnected."}

    return {
        "analysis_id": analysis_id,
        "status": job["status"],
        "progress": job.get("progress", 0.0),
        "current_frame": job.get("current_frame", 0),
        "total_frames": job.get("total_frames", 0),
        "events_count": job.get("events_count", 0),
        "detections_count": job.get("detections_count", 0),
        "error": job.get("error")
    }

class LiveFrameRequest(BaseModel):
    sample_id: Optional[str] = None
    video_id: Optional[str] = None
    timestamp: float = 0.0
    restricted_zone: Optional[List[List[float]]] = None
    enable_boundary_check: Optional[bool] = True

# Video capture cache for fast seeking in live stream detection
cap_cache: Dict[str, Any] = {}

@app.post("/api/detect_live_frame")
def detect_live_frame(req: LiveFrameRequest):
    """
    Real-time dynamic detection on the exact frame at `timestamp` as the video plays.
    """
    video_path = None
    target_key = req.sample_id or req.video_id

    if req.sample_id:
        samples = discover_sample_videos()
        for s in samples:
            if s["id"] == req.sample_id:
                video_path = s["file_path"]
                break
    elif req.video_id:
        video_path = video_registry.get(req.video_id)

    if not video_path or not os.path.exists(video_path):
        clean_id = (req.sample_id or req.video_id or "").replace("vdir-", "").replace("video-", "").replace("_", " ").lower()
        if os.path.exists(VIDEOS_DIR):
            for fname in os.listdir(VIDEOS_DIR):
                if clean_id in fname.lower() or fname.lower() in clean_id or any(w in fname.lower() for w in clean_id.split() if len(w) > 3):
                    video_path = os.path.join(VIDEOS_DIR, fname)
                    break

    if not video_path or not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video file not found.")

    # Check if pre-analyzed result cache exists for instant sub-millisecond return
    cache_file = os.path.join(RESULTS_DIR, f"{target_key}.json")
    if os.path.exists(cache_file):
        try:
            with open(cache_file, "r") as f:
                cached_data = json.load(f)
            frames = cached_data.get("frames", [])
            if frames:
                # Find closest frame by timestamp
                closest = min(frames, key=lambda x: abs(x.get("timestamp", 0) - req.timestamp))
                if abs(closest.get("timestamp", 0) - req.timestamp) < 1.0:
                    # Dynamically re-evaluate zone intrusion on custom zone
                    boundary_check = req.enable_boundary_check if req.enable_boundary_check is not None else True
                    custom_zone = req.restricted_zone or cached_data.get("restricted_zone", [[0.25, 0.25], [0.75, 0.25], [0.75, 0.75], [0.25, 0.75]])
                    
                    frame_objs = []
                    has_intrusion = False
                    new_events = []

                    for obj in closest.get("objects", []):
                        bx, by, bw, bh = obj["bbox"]
                        bcx, bcy = bx + bw / 2.0, by + bh
                        in_zone = is_point_in_polygon((bcx, bcy), custom_zone)
                        is_intruder = in_zone and boundary_check
                        if is_intruder:
                            has_intrusion = True
                        
                        obj_copy = dict(obj)
                        obj_copy["in_restricted_zone"] = is_intruder
                        if is_intruder:
                            obj_copy["color"] = "#ef4444"
                        frame_objs.append(obj_copy)

                    return {
                        "timestamp": req.timestamp,
                        "objects": frame_objs,
                        "has_intrusion": has_intrusion,
                        "new_plates": [p for p in cached_data.get("plate_registry", []) if abs(p.get("timestamp", 0) - req.timestamp) < 0.8],
                        "new_events": [e for e in cached_data.get("events", []) if abs(e.get("timestamp", 0) - req.timestamp) < 0.8],
                        "new_faces": [f for f in cached_data.get("face_captures", []) if abs(f.get("timestamp", 0) - req.timestamp) < 0.8]
                    }
        except Exception:
            pass

    cap = cap_cache.get(video_path)
    if cap is None or not cap.isOpened():
        cap = cv2.VideoCapture(video_path)
        cap_cache[video_path] = cap

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    target_frame = int(req.timestamp * fps)
    cap.set(cv2.CAP_PROP_POS_FRAMES, max(0, target_frame))
    ret, frame = cap.read()

    if not ret or frame is None:
        cap.set(cv2.CAP_PROP_POS_MSEC, req.timestamp * 1000)
        ret, frame = cap.read()

    if not ret or frame is None:
        return {
            "timestamp": req.timestamp,
            "objects": [],
            "has_intrusion": False,
            "new_plates": [],
            "new_events": []
        }

    res = analyzer_instance.detect_live_frame(
        frame=frame,
        timestamp=req.timestamp,
        restricted_zone=req.restricted_zone,
        enable_boundary_check=req.enable_boundary_check if req.enable_boundary_check is not None else True,
        sample_id=req.sample_id or ""
    )
    return res

@app.post("/api/reset_state")
def reset_backend_state():
    """
    Clears live tracking IDs, kinematic history, face snapshot timers, and ANPR queues when video changes.
    """
    analyzer_instance.reset_state()
    return {"status": "SUCCESS", "message": "Backend tracking state reset successfully."}

@app.post("/api/detect_live_image")
async def detect_live_image(
    file: UploadFile = File(...),
    timestamp: float = Query(0.0),
    enable_boundary_check: bool = Query(True),
    restricted_zone_json: Optional[str] = Query(None)
):
    """
    Real-time dynamic detection on an uploaded canvas frame image directly from HTML5 video.
    """
    import cv2
    import numpy as np

    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if frame is None:
        raise HTTPException(status_code=400, detail="Invalid image data")

    zone = None
    if restricted_zone_json:
        try:
            zone = json.loads(restricted_zone_json)
        except Exception:
            zone = None

    res = analyzer_instance.detect_live_frame(
        frame=frame,
        timestamp=timestamp,
        restricted_zone=zone,
        enable_boundary_check=enable_boundary_check
    )
    return res

@app.get("/api/analysis/{analysis_id}/data")
def get_analysis_data(analysis_id: str):
    """
    Returns the complete detection, tracking, event, and statistical JSON payload.
    """
    job = analysis_jobs.get(analysis_id)
    if job and "results" in job:
        return job["results"]

    result_file = os.path.join(RESULTS_DIR, f"{analysis_id}.json")
    if os.path.exists(result_file):
        with open(result_file, "r") as f:
            return json.load(f)

    raise HTTPException(status_code=404, detail="Analysis results not found or still processing.")

@app.get("/api/video/{video_id}")
def stream_video(video_id: str, request: Request):
    """
    Serves video file with HTTP Range header support for smooth HTML5 video scrubbing.
    """
    video_path = video_registry.get(video_id)
    if not video_path:
        # Try finding in sample videos
        samples = discover_sample_videos()
        for s in samples:
            if s["id"] == video_id:
                video_path = s["file_path"]
                break

    if not video_path or not os.path.exists(video_path):
        # Fallback dynamic matching in VIDEOS_DIR
        clean_id = video_id.replace("vdir-", "").replace("video-", "").replace("_", " ").lower()
        if os.path.exists(VIDEOS_DIR):
            for fname in os.listdir(VIDEOS_DIR):
                if clean_id in fname.lower() or fname.lower() in clean_id or any(w in fname.lower() for w in clean_id.split() if len(w) > 3):
                    video_path = os.path.join(VIDEOS_DIR, fname)
                    break

    if not video_path or not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video file not found.")

    file_size = os.path.getsize(video_path)
    range_header = request.headers.get("range")

    mime_type = "video/webm" if video_path.lower().endswith(".webm") else "video/mp4"

    if not range_header:
        return FileResponse(video_path, media_type=mime_type)

    # Range header parsing (e.g., "bytes=0-")
    range_str = range_header.replace("bytes=", "")
    parts = range_str.split("-")
    start = int(parts[0]) if parts[0] else 0
    end = int(parts[1]) if parts[1] else file_size - 1
    end = min(end, file_size - 1)
    chunk_size = (end - start) + 1

    def iterfile():
        with open(video_path, "rb") as f:
            f.seek(start)
            bytes_left = chunk_size
            while bytes_left > 0:
                chunk = f.read(min(64 * 1024, bytes_left))
                if not chunk:
                    break
                bytes_left -= len(chunk)
                yield chunk

    headers = {
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(chunk_size),
        "Content-Type": mime_type,
    }

    return StreamingResponse(iterfile(), status_code=206, headers=headers)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
