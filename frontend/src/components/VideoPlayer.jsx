import React, { useRef, useEffect, useState, useMemo } from "react";
import { Play, Pause, RotateCcw, SkipBack, SkipForward, Maximize, ShieldAlert, FastForward, Crosshair, Check, Undo, Trash2, X, Save, Shield } from "lucide-react";

export default function VideoPlayer({
  videoUrl,
  analysisData,
  liveFrameData,
  customZone,
  currentTime,
  onTimeUpdate,
  isPlaying,
  onTogglePlay,
  onSeek,
  onNextAlert,
  onPrevAlert,
  enableBoundaryCheck = true,
  isDrawingZone = false,
  onToggleDrawZone,
  onSaveDrawnZone
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [speed, setSpeed] = useState(1.0);
  const [containerDim, setContainerDim] = useState({ width: 640, height: 360 });
  const [drawnPoints, setDrawnPoints] = useState([]);
  const [mousePos, setMousePos] = useState(null);

  // 60 FPS Motion Interpolation State
  const [smoothObjects, setSmoothObjects] = useState([]);
  const targetObjectsRef = useRef([]);
  const currentObjectsRef = useRef(new Map());
  const animFrameRef = useRef(null);

  // Sync HTML5 video play/pause with state
  useEffect(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  // Sync external seek (e.g. clicking an event item)
  useEffect(() => {
    if (!videoRef.current) return;
    if (Math.abs(videoRef.current.currentTime - currentTime) > 0.3) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  // Update container dimensions for SVG overlay scaling
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerDim({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Update target objects whenever live detection updates
  useEffect(() => {
    if (liveFrameData && Array.isArray(liveFrameData.objects)) {
      targetObjectsRef.current = liveFrameData.objects;
    }
  }, [liveFrameData]);

  // 60 FPS Smooth Interpolation Loop
  useEffect(() => {
    let active = true;
    const loop = () => {
      if (!active) return;
      const targets = targetObjectsRef.current || [];
      const currentMap = currentObjectsRef.current;
      const nextObjects = [];
      const seenIds = new Set();

      targets.forEach((obj) => {
        const id = obj.tracking_id !== undefined ? String(obj.tracking_id) : (obj.label || Math.random());
        seenIds.add(id);
        const [nx, ny, nw, nh] = obj.bbox;
        const targetX = nx * containerDim.width;
        const targetY = ny * containerDim.height;
        const targetW = Math.max(14, nw * containerDim.width);
        const targetH = Math.max(14, nh * containerDim.height);

        if (!currentMap.has(id)) {
          const state = {
            ...obj,
            x: targetX,
            y: targetY,
            w: targetW,
            h: targetH
          };
          currentMap.set(id, state);
          nextObjects.push(state);
        } else {
          const curr = currentMap.get(id);
          const lerp = 0.32; // Smooth tracking interpolation factor
          curr.x += (targetX - curr.x) * lerp;
          curr.y += (targetY - curr.y) * lerp;
          curr.w += (targetW - curr.w) * lerp;
          curr.h += (targetH - curr.h) * lerp;
          curr.label = obj.label;
          curr.confidence = obj.confidence;
          curr.in_restricted_zone = obj.in_restricted_zone;
          curr.is_running = obj.is_running;
          curr.is_overspeeding = obj.is_overspeeding;
          curr.speed_kmh = obj.speed_kmh;
          curr.plate_number = obj.plate_number;
          curr.color = obj.color;
          nextObjects.push(curr);
        }
      });

      // Remove vanished tracks
      for (const [id] of currentMap) {
        if (!seenIds.has(id)) {
          currentMap.delete(id);
        }
      }

      setSmoothObjects(nextObjects);
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [containerDim]);

  const handleSpeedChange = (newSpeed) => {
    setSpeed(newSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = newSpeed;
    }
  };

  // Find frame bounding boxes: Live real-time frame or closest frame
  const currentFrameData = useMemo(() => {
    if (liveFrameData && Array.isArray(liveFrameData.objects)) return liveFrameData;
    if (!analysisData || !analysisData.frames) return null;
    let closestFrame = null;
    let minDiff = Infinity;
    for (const f of analysisData.frames) {
      const diff = Math.abs(f.timestamp - currentTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestFrame = f;
      }
    }
    return closestFrame;
  }, [liveFrameData, analysisData, currentTime]);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const defaultZone = [[0.25, 0.25], [0.75, 0.25], [0.75, 0.75], [0.25, 0.75]];
  const rawZone = customZone || analysisData?.restricted_zone;
  const restrictedZone = (Array.isArray(rawZone) && rawZone.length > 0 && Array.isArray(rawZone[0])) ? rawZone : defaultZone;
  const events = analysisData?.events || [];
  const duration = analysisData?.video_metadata?.duration || videoRef.current?.duration || 0.1;
  const hasIntrusion = currentFrameData?.has_intrusion && enableBoundaryCheck;

  // Convert normalized polygon points to SVG path / polygon string
  const zonePolygonPoints = restrictedZone
    .map((pt) => {
      if (!Array.isArray(pt) || pt.length < 2) return "0,0";
      const [nx, ny] = pt;
      return `${(nx || 0) * containerDim.width},${(ny || 0) * containerDim.height}`;
    })
    .join(" ");

  // Handle interactive clicks on the video to add polygon points
  const handleContainerClick = (e) => {
    if (!isDrawingZone || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const nx = Math.max(0, Math.min(1, parseFloat((clickX / rect.width).toFixed(4))));
    const ny = Math.max(0, Math.min(1, parseFloat((clickY / rect.height).toFixed(4))));

    setDrawnPoints((prev) => [...prev, [nx, ny]]);
  };

  const handleContainerMouseMove = (e) => {
    if (!isDrawingZone || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setMousePos({
      x: mouseX,
      y: mouseY,
      nx: mouseX / rect.width,
      ny: mouseY / rect.height
    });
  };

  const handleSaveDrawn = () => {
    if (drawnPoints.length >= 3 && onSaveDrawnZone) {
      onSaveDrawnZone(drawnPoints);
      setDrawnPoints([]);
    }
  };

  const handleCancelDrawing = () => {
    setDrawnPoints([]);
    if (onToggleDrawZone) onToggleDrawZone();
  };

  return (
    <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 backdrop-blur-xl flex flex-col space-y-3 relative overflow-hidden shadow-2xl">
      {/* Interactive Drawing Toolbar Banner */}
      {isDrawingZone && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 px-3 rounded-xl bg-amber-950/90 border border-amber-500/80 shadow-lg shadow-amber-950/50 animate-fadeIn z-30">
          <div className="flex items-center gap-2 font-mono text-xs text-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            <span className="font-bold text-amber-300 uppercase tracking-wider">DRAWING CUSTOM ZONE</span>
            <span className="text-amber-500">•</span>
            <span>Click on video to add corners ({drawnPoints.length} placed, min 3)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setDrawnPoints((prev) => prev.slice(0, -1))}
              disabled={drawnPoints.length === 0}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-zinc-300 text-xs font-mono transition-all border border-zinc-800"
            >
              <Undo className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>
            <button
              onClick={() => setDrawnPoints([])}
              disabled={drawnPoints.length === 0}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-zinc-300 text-xs font-mono transition-all border border-zinc-800"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
            <button
              onClick={handleCancelDrawing}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-mono transition-all border border-zinc-800"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
            <button
              onClick={handleSaveDrawn}
              disabled={drawnPoints.length < 3}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 disabled:opacity-40 text-zinc-950 font-bold text-xs font-mono shadow-md transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Zone ({drawnPoints.length}/3+)</span>
            </button>
          </div>
        </div>
      )}

      {/* Video Container + Overlay */}
      <div
        ref={containerRef}
        onClick={handleContainerClick}
        onMouseMove={handleContainerMouseMove}
        className={`relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-zinc-800 shadow-2xl flex items-center justify-center group ${
          isDrawingZone ? "cursor-crosshair ring-2 ring-amber-500/50" : ""
        }`}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          onTimeUpdate={(e) => onTimeUpdate(e.target.currentTime)}
          onEnded={() => onTogglePlay(false)}
          className="w-full h-full object-contain pointer-events-auto"
          playsInline
        />

        {/* HUD Elements */}
        <div className="hud-corner hud-top-left" />
        <div className="hud-corner hud-top-right" />
        <div className="hud-corner hud-bottom-left" />
        <div className="hud-corner hud-bottom-right" />

        {/* Live Feed Status Tag */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-2.5 py-1 rounded bg-slate-950/80 backdrop-blur border border-slate-700 font-mono text-[11px] text-slate-200">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
          <span className="font-bold text-red-400">CAM-01 [LIVE]</span>
          <span className="text-slate-500">|</span>
          <span className="text-cyan-400">{formatTime(currentTime)}</span>
        </div>

        {/* Intrusion Warning Banner */}
        {hasIntrusion && !isDrawingZone && (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-2 px-3 py-1 rounded bg-red-950/90 border border-red-500 text-red-200 font-mono text-xs font-bold animate-pulse shadow-lg shadow-red-900/50">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>🚨 RESTRICTED ZONE BREACH</span>
          </div>
        )}

        {/* SVG Detection & Zone Overlay */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-20"
          viewBox={`0 0 ${containerDim.width} ${containerDim.height}`}
        >
          {/* Active Drawing Zone Canvas */}
          {isDrawingZone && drawnPoints.length > 0 && (
            <g>
              {/* Drawn Polygon Fill (if >= 3 points) */}
              {drawnPoints.length >= 3 && (
                <polygon
                  points={drawnPoints.map(([nx, ny]) => `${nx * containerDim.width},${ny * containerDim.height}`).join(" ")}
                  fill="rgba(245, 158, 11, 0.2)"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />
              )}

              {/* Drawn Lines connecting vertices */}
              {drawnPoints.map((pt, idx) => {
                if (idx === 0) return null;
                const prev = drawnPoints[idx - 1];
                return (
                  <line
                    key={`drawn-line-${idx}`}
                    x1={prev[0] * containerDim.width}
                    y1={prev[1] * containerDim.height}
                    x2={pt[0] * containerDim.width}
                    y2={pt[1] * containerDim.height}
                    stroke="#f59e0b"
                    strokeWidth="3"
                  />
                );
              })}

              {/* Dynamic Preview Line from last point to mouse cursor */}
              {mousePos && drawnPoints.length > 0 && (
                <g>
                  <line
                    x1={drawnPoints[drawnPoints.length - 1][0] * containerDim.width}
                    y1={drawnPoints[drawnPoints.length - 1][1] * containerDim.height}
                    x2={mousePos.x}
                    y2={mousePos.y}
                    stroke="#fbbf24"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                  />
                  {drawnPoints.length >= 2 && (
                    <line
                      x1={mousePos.x}
                      y1={mousePos.y}
                      x2={drawnPoints[0][0] * containerDim.width}
                      y2={drawnPoints[0][1] * containerDim.height}
                      stroke="#fbbf24"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                      opacity="0.6"
                    />
                  )}
                </g>
              )}

              {/* Vertex Nodes with Point Labels */}
              {drawnPoints.map(([nx, ny], idx) => {
                const px = nx * containerDim.width;
                const py = ny * containerDim.height;
                return (
                  <g key={`drawn-pt-${idx}`}>
                    <circle
                      cx={px}
                      cy={py}
                      r="6"
                      fill="#f59e0b"
                      stroke="#ffffff"
                      strokeWidth="2"
                      style={{ filter: "drop-shadow(0 0 6px rgba(245, 158, 11, 0.8))" }}
                    />
                    <rect
                      x={px + 8}
                      y={py - 16}
                      width="26"
                      height="16"
                      fill="#0f172a"
                      rx="3"
                      stroke="#f59e0b"
                      strokeWidth="1"
                    />
                    <text
                      x={px + 12}
                      y={py - 4}
                      fill="#f59e0b"
                      fontSize="10"
                      fontWeight="bold"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      P{idx + 1}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* Saved Restricted Zone Polygon (when not actively drawing) */}
          {!isDrawingZone && enableBoundaryCheck && zonePolygonPoints && (
            <g>
              <polygon
                points={zonePolygonPoints}
                fill={hasIntrusion ? "rgba(239, 68, 68, 0.25)" : "rgba(0, 240, 255, 0.08)"}
                stroke={hasIntrusion ? "#ef4444" : "#00f0ff"}
                strokeWidth="2"
                strokeDasharray={hasIntrusion ? "6 3" : "4 2"}
                className="transition-all duration-300"
              />
              {/* Zone Label */}
              <text
                x={restrictedZone[0][0] * containerDim.width + 10}
                y={restrictedZone[0][1] * containerDim.height + 20}
                fill={hasIntrusion ? "#ef4444" : "#00f0ff"}
                fontSize="11"
                fontWeight="bold"
                fontFamily="JetBrains Mono, monospace"
              >
                {hasIntrusion ? "⚠️ BREACH IN PROGRESS" : "🛡️ RESTRICTED ZONE [MONITORED]"}
              </text>
            </g>
          )}

          {/* Render Frame Object Bounding Boxes (60 FPS Smooth Motion Interpolation) */}
          {(smoothObjects.length > 0 ? smoothObjects : (currentFrameData?.objects || [])).map((obj, idx) => {
            const x = obj.x !== undefined ? obj.x : (obj.bbox[0] * containerDim.width);
            const y = obj.y !== undefined ? obj.y : (obj.bbox[1] * containerDim.height);
            const w = obj.w !== undefined ? obj.w : Math.max(14, obj.bbox[2] * containerDim.width);
            const h = obj.h !== undefined ? obj.h : Math.max(14, obj.bbox[3] * containerDim.height);
            const isPerson = obj.class === "person";
            const isVehicle = ["car", "truck", "bus", "motorcycle", "bicycle", "train", "boat", "airplane"].includes(obj.class);
            const isIntruder = obj.in_restricted_zone;
            const isSpeeding = obj.is_overspeeding;
            const isRunning = obj.is_running;
            const color = isIntruder || isSpeeding ? "#ef4444" : (isRunning ? "#f97316" : (isPerson ? "#38bdf8" : (isVehicle ? "#f59e0b" : (obj.color || "#a855f7"))));
            const fillBg = isIntruder || isSpeeding ? "rgba(239, 68, 68, 0.15)" : (isRunning ? "rgba(249, 115, 22, 0.12)" : (isPerson ? "rgba(56, 189, 248, 0.06)" : (isVehicle ? "rgba(245, 158, 11, 0.06)" : "rgba(168, 85, 247, 0.08)")));

            return (
              <g key={`bbox-${obj.tracking_id || idx}-${obj.label}`}>
                {/* Main Bounding Box Rectangle */}
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  fill={fillBg}
                  stroke={color}
                  strokeWidth={isIntruder || isSpeeding ? "3" : "2"}
                  rx="6"
                />

                {/* Class Label Pill Header */}
                <rect
                  x={Math.max(2, x)}
                  y={y > 28 ? y - 26 : y + h + 2}
                  width={Math.max(90, obj.label.length * 8.0 + 35)}
                  height="24"
                  fill={isIntruder || isSpeeding ? "#dc2626" : "#0f172a"}
                  opacity="0.95"
                  rx="6"
                  stroke={color}
                  strokeWidth="1.5"
                />
                <text
                  x={Math.max(8, x + 8)}
                  y={y > 28 ? y - 9 : y + h + 18}
                  fill="#ffffff"
                  fontSize="12"
                  fontWeight="600"
                  fontFamily="Inter, sans-serif"
                >
                  {obj.label} <tspan fill={isIntruder || isSpeeding ? "#fecaca" : "#94a3b8"} fontSize="11">[{Math.round(obj.confidence)}%]</tspan>
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Video Control Bar */}
      <div className="space-y-2">
        {/* Timeline with Alert Event Ticks */}
        <div className="relative w-full h-3 bg-slate-900 rounded border border-slate-800 flex items-center cursor-pointer group">
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
          />
          {/* Progress fill */}
          <div
            className="h-full bg-cyan-500/80 rounded-l transition-all duration-75 pointer-events-none"
            style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
          />
          {/* Event markers on timeline */}
          {events.map((evt) => {
            const pct = (evt.timestamp / (duration || 1)) * 100;
            const isCritical = evt.severity === "CRITICAL" || evt.severity === "HIGH";
            return (
              <div
                key={`tick-${evt.id}`}
                className={`absolute top-0 bottom-0 w-1 z-10 pointer-events-none ${
                  isCritical ? "bg-red-500 shadow-md shadow-red-500" : "bg-amber-400"
                }`}
                style={{ left: `${pct}%` }}
                title={`${evt.severity}: ${evt.title} (${formatTime(evt.timestamp)})`}
              />
            );
          })}
        </div>

        {/* Buttons & Timecode controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-zinc-300 pt-1">
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <button
              onClick={() => onTogglePlay(!isPlaying)}
              className="p-2.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 transition-all shadow-sm"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-cyan-300" />}
            </button>

            {/* Jump Alert Buttons */}
            <button
              onClick={onPrevAlert}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-all"
              title="Jump to Previous Incident"
            >
              <SkipBack className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">PREV INCIDENT</span>
            </button>
            <button
              onClick={onNextAlert}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-all"
              title="Jump to Next Incident"
            >
              <span className="hidden sm:inline">NEXT INCIDENT</span>
              <SkipForward className="w-3.5 h-3.5 text-cyan-400" />
            </button>

            {/* Time Display */}
            <div className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-cyan-400 font-bold">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          {/* Speed selector */}
          <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
            {[0.5, 1.0, 1.5, 2.0].map((s) => (
              <button
                key={s}
                onClick={() => handleSpeedChange(s)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all ${
                  speed === s
                    ? "bg-zinc-800 text-cyan-300 border border-zinc-700 font-bold shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
