import React, { useState, useEffect, useRef } from "react";
import Header from "./components/Header";
import VideoSelectorBar from "./components/VideoSelectorBar";
import VideoPlayer from "./components/VideoPlayer";
import AlertFeed from "./components/AlertFeed";
import StatsGrid from "./components/StatsGrid";
import ANPRRegistry from "./components/ANPRRegistry";
import FaceGallery from "./components/FaceGallery";
import ZoneEditorModal from "./components/ZoneEditorModal";
import { playSecurityAlarm } from "./utils/audioAlert";
import { Bell, Car, UserCheck } from "lucide-react";

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
  const [enableBoundaryCheck, setEnableBoundaryCheck] = useState(false);
  const [isDrawingZone, setIsDrawingZone] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState("ALERTS");
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
        console.error("Error loading sample feeds:", err);
      });
  }, []);

  const resetLiveDetectionState = () => {
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
    trackedPeopleRef.current.clear();
    trackedVehiclesRef.current.clear();
    trackedObjectsRef.current.clear();
    trackedPlatesRef.current.clear();
    trackedFacesRef.current.clear();
    triggeredEventsRef.current.clear();
    lastProcessedTimeRef.current = -1;

    fetch(`${API_BASE}/reset_state`, { method: "POST" }).catch(() => {});
  };

  // High-frequency live frame AI detection loop
  useEffect(() => {
    if (!activeVideoId) return;

    // Minimum throttle 0.08s between AI detections
    if (Math.abs(currentTime - lastProcessedTimeRef.current) < 0.08) return;
    if (isDetectingRef.current) return;

    lastProcessedTimeRef.current = currentTime;
    isDetectingRef.current = true;

    fetch(`${API_BASE}/detect_live_frame`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timestamp: currentTime,
        sample_id: activeVideoId,
        enable_boundary_check: enableBoundaryCheck,
        restricted_zone: customZone
      })
    })
      .then((res) => res.json())
      .then((data) => {
        isDetectingRef.current = false;
        if (!data || !data.objects) return;

        // 1. Update live SVG overlay frame bounding boxes
        setLiveFrameData(data);

        // 2. Track unique objects across scene
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
                if (face.is_masked) existing.is_masked = true;
                if (face.is_running) existing.is_running = true;
                if (face.image_url && (!existing.image_url || face.confidence >= existing.confidence)) {
                  existing.image_url = face.image_url;
                  existing.confidence = face.confidence;
                }
              }
            });
            return Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
          });
        }

        // 5. Dynamically append new events (speeding, running, masked, zone intrusions) and trigger alarm
        if (data.new_events && data.new_events.length > 0) {
          const freshEvents = data.new_events.filter((e) => {
            // Zone breach only alerts when boundary radar is ON
            if (e.type === "restricted_zone_intrusion" && !enableBoundaryCheck) {
              return false;
            }
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
          intrusion_count: (data.has_intrusion && enableBoundaryCheck) ? Math.max(prev.intrusion_count, prev.intrusion_count + 1) : prev.intrusion_count,
          total_alerts: triggeredEventsRef.current.size + ((data.has_intrusion && enableBoundaryCheck) ? 1 : 0)
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
      const sorted = [...liveEvents].sort((a, b) => a.timestamp - b.timestamp);
      const next = sorted.find((e) => e.timestamp > currentTime + 0.3);
      if (next) {
        setCurrentTime(next.timestamp);
        return;
      }
    }
    setCurrentTime((t) => Math.min(t + 5.0, 9999));
  };

  const handlePrevAlert = () => {
    if (liveEvents.length > 0) {
      const sorted = [...liveEvents].sort((a, b) => a.timestamp - b.timestamp);
      const prevList = sorted.filter((e) => e.timestamp < currentTime - 0.3);
      if (prevList.length > 0) {
        setCurrentTime(prevList[prevList.length - 1].timestamp);
        return;
      }
    }
    setCurrentTime((t) => Math.max(0, t - 5.0));
  };

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-[1750px] mx-auto space-y-5">
      <Header
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
        {/* Main Video & KPIs */}
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
            muted={muted}
            onToggleMute={() => setMuted(!muted)}
          />

          <StatsGrid statistics={liveStats} />
        </div>

        {/* Right Dynamic Hub */}
        <div className="lg:col-span-5 flex flex-col space-y-3">
          {/* Minimal Tab Switcher */}
          <div className="flex items-center gap-2 p-2 bg-zinc-900/90 rounded-3xl border border-zinc-800 backdrop-blur-2xl shadow-xl">
            <button
              onClick={() => setRightPanelTab("ALERTS")}
              className={`flex-1 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                rightPanelTab === "ALERTS"
                  ? "bg-zinc-800 border border-zinc-600 text-white shadow-lg"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850"
              }`}
            >
              <Bell className="w-3.5 h-3.5 text-zinc-300" />
              <span>INCIDENTS</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-950 text-zinc-300 border border-zinc-800 font-mono">
                {liveEvents.length}
              </span>
            </button>

            <button
              onClick={() => setRightPanelTab("ANPR")}
              className={`flex-1 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                rightPanelTab === "ANPR"
                  ? "bg-zinc-800 border border-zinc-600 text-white shadow-lg"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850"
              }`}
            >
              <Car className="w-3.5 h-3.5 text-zinc-300" />
              <span>ANPR</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-950 text-zinc-300 border border-zinc-800 font-mono">
                {livePlates.length}
              </span>
            </button>

            <button
              onClick={() => setRightPanelTab("FACES")}
              className={`flex-1 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                rightPanelTab === "FACES"
                  ? "bg-zinc-800 border border-zinc-600 text-white shadow-lg"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-zinc-300" />
              <span>FACES</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-950 text-zinc-300 border border-zinc-800 font-mono">
                {liveFaces.length}
              </span>
            </button>
          </div>

          {/* Tab Panel Views */}
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

          {rightPanelTab === "FACES" && (
            <FaceGallery
              faces={liveFaces}
              currentTime={currentTime}
              onSeekToTimestamp={handleSeekToTimestamp}
              onClearFaces={() => setLiveFaces([])}
            />
          )}
        </div>
      </div>

      {showZoneModal && (
        <ZoneEditorModal
          isOpen={showZoneModal}
          onClose={() => setShowZoneModal(false)}
          onSaveZone={handleSaveZone}
          currentZone={customZone}
        />
      )}
    </div>
  );
}
