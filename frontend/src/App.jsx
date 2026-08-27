import React, { useState, useEffect, useRef } from "react";
import Header from "./components/Header";
import VideoSelectorBar from "./components/VideoSelectorBar";
import UploadModal from "./components/UploadModal";
import VideoPlayer from "./components/VideoPlayer";
import AlertFeed from "./components/AlertFeed";
import StatsGrid from "./components/StatsGrid";
import ANPRRegistry from "./components/ANPRRegistry";
import EvidenceAuditLog from "./components/EvidenceAuditLog";
import FaceGallery from "./components/FaceGallery";
import EventHistory from "./components/EventHistory";
import ZoneEditorModal from "./components/ZoneEditorModal";
import { playSecurityAlarm } from "./utils/audioAlert";
import { Bell, Car, FileText, UserCheck } from "lucide-react";

const API_BASE = "http://localhost:8000/api";

export default function App() {
  const [samples, setSamples] = useState([]);
  const [activeVideoId, setActiveVideoId] = useState(null);
  const [activeVideoTitle, setActiveVideoTitle] = useState("");
  const [activeVideoUrl, setActiveVideoUrl] = useState("");
  
  // Real-time live detection state
  const [liveFrameData, setLiveFrameData] = useState(null);
  const [livePlates, setLivePlates] = useState([]);
  const [liveEvents, setLiveEvents] = useState([]);
  const [liveFaces, setLiveFaces] = useState([]);
  const [liveStats, setLiveStats] = useState({
    people_count: 0,
    vehicle_count: 0,
    objects_count: 0,
    plates_scanned_count: 0,
    intrusion_count: 0,
    total_alerts: 0
  });

  const trackedPeopleRef = useRef(new Set());
  const trackedVehiclesRef = useRef(new Set());
  const trackedObjectsRef = useRef(new Set());
  const trackedPlatesRef = useRef(new Set());
  const trackedFacesRef = useRef(new Map());
  const triggeredEventsRef = useRef(new Set());
  const lastProcessedTimeRef = useRef(-1);
  const isDetectingRef = useRef(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [customZone, setCustomZone] = useState(null);
  const [enableBoundaryCheck, setEnableBoundaryCheck] = useState(true);
  const [isDrawingZone, setIsDrawingZone] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState("ALERTS");
  const [error, setError] = useState(null);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showZoneModal, setShowZoneModal] = useState(false);

  // Load sample videos on startup
  useEffect(() => {
    fetch(`${API_BASE}/samples`)
      .then((res) => res.json())
      .then((data) => {
        setSamples(data);
        if (data && data.length > 0) {
          const first = data[0];
          setActiveVideoId(first.id);
          setActiveVideoTitle(first.title);
          setActiveVideoUrl(`${API_BASE}/video/${first.id}`);
          resetLiveDetectionState();
        }
      })
      .catch((err) => {
        console.error("Failed to load sample feeds:", err);
      });
  }, []);

  const resetLiveDetectionState = () => {
    trackedPeopleRef.current.clear();
    trackedVehiclesRef.current.clear();
    trackedObjectsRef.current.clear();
    trackedPlatesRef.current.clear();
    trackedFacesRef.current.clear();
    triggeredEventsRef.current.clear();
    lastProcessedTimeRef.current = -1;
    isDetectingRef.current = false;
    
    // Reset backend tracking history and queues
    fetch(`${API_BASE}/reset_state`, { method: "POST" }).catch(() => {});

    setLiveFrameData(null);
    setLivePlates([]);
    setLiveEvents([]);
    setLiveFaces([]);
    setLiveStats({
      people_count: 0,
      vehicle_count: 0,
      objects_count: 0,
      plates_scanned_count: 0,
      intrusion_count: 0,
      total_alerts: 0
    });
    setCurrentTime(0);
    setIsPlaying(true);
  };

  // Real-time live frame detection hook as video plays
  useEffect(() => {
    if (!activeVideoId) return;

    const timeDiff = Math.abs(currentTime - lastProcessedTimeRef.current);
    if (timeDiff < 0.06 || isDetectingRef.current) return;

    isDetectingRef.current = true;
    lastProcessedTimeRef.current = currentTime;

    fetch(`${API_BASE}/detect_live_frame`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sample_id: activeVideoId,
        timestamp: currentTime,
        restricted_zone: customZone,
        enable_boundary_check: enableBoundaryCheck
      })
    })
      .then((res) => res.json())
      .then((data) => {
        isDetectingRef.current = false;
        if (!data || !data.objects) return;

        // 1. Set current frame bounding boxes
        setLiveFrameData({
          timestamp: data.timestamp,
          objects: data.objects,
          has_intrusion: data.has_intrusion
        });

        // 2. Dynamically count people, vehicles, and objects seen
        data.objects.forEach((obj) => {
          if (obj.class === "person") {
            trackedPeopleRef.current.add(obj.tracking_id);
          } else if (["car", "truck", "bus", "motorcycle", "bicycle", "train", "boat"].includes(obj.class)) {
            trackedVehiclesRef.current.add(obj.tracking_id);
          } else {
            const objKey = `${obj.class}-${obj.tracking_id}`;
            trackedObjectsRef.current.add(objKey);
          }
        });

        // 3. Dynamically append new license plates
        if (data.new_plates && data.new_plates.length > 0) {
          setLivePlates((prev) => {
            const next = [...prev];
            data.new_plates.forEach((p) => {
              if (!trackedPlatesRef.current.has(p.plate_number)) {
                trackedPlatesRef.current.add(p.plate_number);
                next.unshift(p);
              }
            });
            return next;
          });
        }

        // 4. Dynamically append zoomed face captures
        if (data.new_faces && data.new_faces.length > 0) {
          setLiveFaces((prev) => {
            const map = new Map(prev.map((f) => [f.tracking_id, f]));
            data.new_faces.forEach((face) => {
              if (!map.has(face.tracking_id)) {
                map.set(face.tracking_id, {
                  ...face,
                  occurrences: 1
                });
              } else {
                const existing = map.get(face.tracking_id);
                existing.timestamp = face.timestamp;
                existing.occurrences = (existing.occurrences || 1) + 1;
                if (face.in_restricted_zone) existing.in_restricted_zone = true;
                if (face.image_url && (!existing.image_url || face.confidence >= existing.confidence)) {
                  existing.image_url = face.image_url;
                  existing.confidence = face.confidence;
                }
              }
            });
            return Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
          });
        }

        // 5. Dynamically append new events and trigger alarm
        if (data.new_events && data.new_events.length > 0 && enableBoundaryCheck) {
          const freshEvents = data.new_events.filter((e) => {
            const key = `${e.title}-${Math.floor(currentTime / 2)}`;
            if (!triggeredEventsRef.current.has(key)) {
              triggeredEventsRef.current.add(key);
              return true;
            }
            return false;
          });

          if (freshEvents.length > 0) {
            setLiveEvents((prev) => [...freshEvents, ...prev]);
            playSecurityAlarm("CRITICAL", muted);
          }
        }

        // 6. Update KPI metrics dynamically
        setLiveStats((prev) => ({
          people_count: trackedPeopleRef.current.size,
          vehicle_count: trackedVehiclesRef.current.size,
          objects_count: trackedObjectsRef.current.size,
          plates_scanned_count: trackedPlatesRef.current.size,
          intrusion_count: data.has_intrusion ? Math.max(prev.intrusion_count, prev.intrusion_count + 1) : prev.intrusion_count,
          total_alerts: triggeredEventsRef.current.size + (data.has_intrusion ? 1 : 0)
        }));
      })
      .catch(() => {
        isDetectingRef.current = false;
      });
  }, [currentTime, activeVideoId, customZone, enableBoundaryCheck, muted]);

  const handleSelectSample = (sampleId) => {
    const s = samples.find((x) => x.id === sampleId);
    setActiveVideoId(sampleId);
    setActiveVideoTitle(s ? s.title : sampleId);
    setActiveVideoUrl(`${API_BASE}/video/${sampleId}`);
    resetLiveDetectionState();
  };

  const handleUploadFile = (file) => {
    setError(null);
    const formData = new FormData();
    formData.append("file", file);

    fetch(`${API_BASE}/upload`, {
      method: "POST",
      body: formData
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.video_id) {
          setActiveVideoId(data.video_id);
          setActiveVideoTitle(file.name);
          setActiveVideoUrl(`${API_BASE}/video/${data.video_id}`);
          setShowUploadModal(false);
          resetLiveDetectionState();
        } else {
          setError(data.detail || "Upload failed.");
        }
      })
      .catch(() => {
        setError("File upload failed.");
      });
  };

  const handleSaveZone = (newZone) => {
    setCustomZone(newZone);
    setShowZoneModal(false);
    setIsDrawingZone(false);
    setEnableBoundaryCheck(true);
  };

  const handleToggleBoundaryCheck = () => {
    setEnableBoundaryCheck(!enableBoundaryCheck);
  };

  const handleSeekToTimestamp = (ts) => {
    setCurrentTime(ts);
    setIsPlaying(true);
  };

  const handleNextAlert = () => {
    if (liveEvents.length > 0) {
      const futureEvents = liveEvents.filter((e) => e.timestamp > currentTime + 0.5);
      if (futureEvents.length > 0) {
        setCurrentTime(futureEvents[0].timestamp);
      }
    }
  };

  const handlePrevAlert = () => {
    if (liveEvents.length > 0) {
      const pastEvents = liveEvents.filter((e) => e.timestamp < currentTime - 0.5);
      if (pastEvents.length > 0) {
        setCurrentTime(pastEvents[pastEvents.length - 1].timestamp);
      }
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-[1700px] mx-auto space-y-5">
      <Header
        onOpenUpload={() => setShowUploadModal(true)}
        onOpenZoneEditor={() => setShowZoneModal(true)}
        muted={muted}
        onToggleMute={() => setMuted(!muted)}
        videoTitle={activeVideoTitle}
        activeVideoId={activeVideoId}
        enableBoundaryCheck={enableBoundaryCheck}
        onToggleBoundaryCheck={handleToggleBoundaryCheck}
        isDrawingZone={isDrawingZone}
        onToggleDrawZone={() => setIsDrawingZone(!isDrawingZone)}
      />

      <VideoSelectorBar
        samples={samples}
        activeVideoId={activeVideoId}
        onSelectVideo={handleSelectSample}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Main Video & KPIs (7 cols on lg screens) */}
        <div className="lg:col-span-7 space-y-4">
          <VideoPlayer
            videoUrl={activeVideoUrl}
            analysisData={null}
            liveFrameData={liveFrameData}
            customZone={customZone}
            currentTime={currentTime}
            onTimeUpdate={setCurrentTime}
            isPlaying={isPlaying}
            onTogglePlay={setIsPlaying}
            onSeek={handleSeekToTimestamp}
            onNextAlert={handleNextAlert}
            onPrevAlert={handlePrevAlert}
            enableBoundaryCheck={enableBoundaryCheck}
            isDrawingZone={isDrawingZone}
            onToggleDrawZone={() => setIsDrawingZone(!isDrawingZone)}
            onSaveDrawnZone={handleSaveZone}
          />

          <StatsGrid statistics={liveStats} />
        </div>

        {/* Right Dynamic Hub (5 cols on lg screens) */}
        <div className="lg:col-span-5 flex flex-col space-y-3">
          {/* Minimal Tab Switcher */}
          <div className="flex items-center gap-1.5 p-1.5 bg-slate-900/90 rounded-2xl border border-slate-800/80 backdrop-blur-xl shadow-lg">
            <button
              onClick={() => setRightPanelTab("ALERTS")}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                rightPanelTab === "ALERTS"
                  ? "bg-slate-800 border border-rose-500/60 text-rose-300 shadow-md"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <Bell className="w-3.5 h-3.5 text-rose-400" />
              <span>ALERTS</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20">
                {liveEvents.length}
              </span>
            </button>

            <button
              onClick={() => setRightPanelTab("ANPR")}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                rightPanelTab === "ANPR"
                  ? "bg-slate-800 border border-emerald-500/60 text-emerald-300 shadow-md"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <Car className="w-3.5 h-3.5 text-emerald-400" />
              <span>ANPR</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                {livePlates.length}
              </span>
            </button>

            <button
              onClick={() => setRightPanelTab("EVIDENCE")}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                rightPanelTab === "EVIDENCE"
                  ? "bg-slate-800 border border-indigo-500/60 text-indigo-300 shadow-md"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>EVIDENCE</span>
            </button>

            <button
              onClick={() => setRightPanelTab("FACES")}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                rightPanelTab === "FACES"
                  ? "bg-slate-800 border border-sky-500/60 text-sky-300 shadow-md"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>FACES</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20">
                {liveFaces.length}
              </span>
            </button>
          </div>

          {/* Active Expandable Tab View */}
          {rightPanelTab === "ALERTS" && (
            <AlertFeed
              events={liveEvents}
              currentTime={currentTime}
              onSeekToTimestamp={handleSeekToTimestamp}
            />
          )}

          {rightPanelTab === "ANPR" && (
            <ANPRRegistry
              plateRegistry={livePlates}
              currentTime={currentTime}
              onSeekToTimestamp={handleSeekToTimestamp}
            />
          )}

          {rightPanelTab === "EVIDENCE" && (
            <EvidenceAuditLog
              events={liveEvents}
              currentTime={currentTime}
              onSeekToTimestamp={handleSeekToTimestamp}
              videoTitle={activeVideoTitle}
            />
          )}

          {rightPanelTab === "FACES" && (
            <FaceGallery
              faces={liveFaces}
              currentTime={currentTime}
              onSeekToTimestamp={handleSeekToTimestamp}
              onClearFaces={() => {
                setLiveFaces([]);
                trackedFacesRef.current.clear();
              }}
            />
          )}
        </div>
      </div>

      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        samples={samples}
        onSelectSample={handleSelectSample}
        onUploadFile={handleUploadFile}
        isProcessing={false}
        error={error}
      />

      <ZoneEditorModal
        isOpen={showZoneModal}
        onClose={() => setShowZoneModal(false)}
        currentZone={customZone}
        onSaveZone={handleSaveZone}
      />
    </div>
  );
}
