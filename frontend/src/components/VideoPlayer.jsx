import React, { useRef, useEffect, useState, useMemo } from "react";
import { Play, Pause, SkipBack, SkipForward, Maximize, ShieldAlert, Crosshair, Check, Undo, Trash2, X, Save } from "lucide-react";

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
  onSaveDrawnZone,
  muted = false,
  onToggleMute
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [speed, setSpeed] = useState(1.0);
  const [containerDim, setContainerDim] = useState({ width: 640, height: 360 });
  const [drawnPoints, setDrawnPoints] = useState([]);
  const [mousePos, setMousePos] = useState(null);

  const [smoothObjects, setSmoothObjects] = useState([]);
  const targetObjectsRef = useRef([]);
  const currentObjectsRef = useRef(new Map());
  const animFrameRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;

      if (e.code === "Space") {
        e.preventDefault();
        onTogglePlay?.(!isPlaying);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        onNextAlert?.();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        onPrevAlert?.();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        if (containerRef.current) {
          if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen?.().catch(() => {});
          } else {
            document.exitFullscreen?.().catch(() => {});
          }
        }
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        onToggleMute?.();
      } else if (e.key === "z" || e.key === "Z") {
        e.preventDefault();
        onToggleDrawZone?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, onTogglePlay, onNextAlert, onPrevAlert, onToggleMute, onToggleDrawZone]);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!videoRef.current) return;
    if (Math.abs(videoRef.current.currentTime - currentTime) > 0.3) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

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

  useEffect(() => {
    if (liveFrameData && Array.isArray(liveFrameData.objects)) {
      targetObjectsRef.current = liveFrameData.objects;
    }
  }, [liveFrameData]);

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
          const state = { ...obj, x: targetX, y: targetY, w: targetW, h: targetH };
          currentMap.set(id, state);
          nextObjects.push(state);
        } else {
          const curr = currentMap.get(id);
          const lerp = 0.32;
          curr.x += (targetX - curr.x) * lerp;
          curr.y += (targetY - curr.y) * lerp;
          curr.w += (targetW - curr.w) * lerp;
          curr.h += (targetH - curr.h) * lerp;
          curr.label = obj.label;
          curr.confidence = obj.confidence;
          curr.in_restricted_zone = obj.in_restricted_zone;
          curr.is_running = obj.is_running;
          curr.is_masked = obj.is_masked;
          curr.is_overspeeding = obj.is_overspeeding;
          curr.speed_kmh = obj.speed_kmh;
          curr.plate_number = obj.plate_number;
          curr.color = obj.color;
          nextObjects.push(curr);
        }
      });

      for (const [id] of currentMap) {
        if (!seenIds.has(id)) currentMap.delete(id);
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
    if (videoRef.current) videoRef.current.playbackRate = newSpeed;
  };

  const currentFrameData = useMemo(() => {
    if (liveFrameData && Array.isArray(liveFrameData.objects)) return liveFrameData;
    if (!analysisData || !analysisData.frames) return null;
    let closestFrame = null;
    let minDiff = Infinity;
    for (const f of analysisData.frames) {
      const diff = Math.abs(f.timestamp - currentTime);
      if (diff < minDiff) { minDiff = diff; closestFrame = f; }
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

  const zonePolygonPoints = restrictedZone.map((pt) => {
    const px = pt[0] * containerDim.width;
    const py = pt[1] * containerDim.height;
    return `${px},${py}`;
  }).join(" ");

  const handleSvgClick = (e) => {
    if (!isDrawingZone) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setDrawnPoints((prev) => [...prev, [nx, ny]]);
  };

  const handleMouseMove = (e) => {
    if (!isDrawingZone) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleFinishZone = () => {
    if (drawnPoints.length >= 3) {
      onSaveDrawnZone?.(drawnPoints);
      setDrawnPoints([]);
      onToggleDrawZone?.();
    }
  };

  const handleClearZone = () => setDrawnPoints([]);
  const handleUndoPoint = () => setDrawnPoints((prev) => prev.slice(0, -1));
  const cleanLabelText = (label) => label ? label.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim() : "";

  return (
    <div className="flex flex-col gap-4 p-5 rounded-3xl bg-zinc-900/90 border border-zinc-800 backdrop-blur-2xl shadow-2xl">
      <div
        ref={containerRef}
        className={`relative w-full aspect-video bg-zinc-950 rounded-2xl overflow-hidden border transition-all duration-300 ${hasIntrusion ? "border-rose-500 shadow-2xl shadow-rose-950/40" : "border-zinc-800/90"}`}
        onMouseMove={handleMouseMove}
        onClick={handleSvgClick}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          playsInline
          muted={muted}
          onTimeUpdate={(e) => onTimeUpdate(e.target.currentTime)}
          onEnded={() => onTogglePlay(false)}
          className="w-full h-full object-contain pointer-events-none"
        />

        <div className="absolute top-4 left-4 z-20 flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs font-mono font-bold text-zinc-200 shadow-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>LIVE 60FPS</span>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs font-mono font-semibold text-zinc-300 shadow-md">
            <span>TC: {formatTime(currentTime)}</span>
          </div>
        </div>

        {/* Real-time Traffic Velocity & Speeding HUD (Top Right) */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          {(() => {
            const vehicles = smoothObjects.filter((o) => ["car", "truck", "bus", "motorcycle"].includes(o.class));
            const speedingCount = vehicles.filter((v) => v.is_overspeeding).length;
            const normalCount = vehicles.filter((v) => !v.is_overspeeding).length;

            return (
              <div className="flex items-center gap-2">
                {speedingCount > 0 && (
                  <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-950/90 border border-rose-500/80 text-rose-200 text-xs font-mono font-bold shadow-lg animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>{speedingCount} SPEEDING</span>
                  </div>
                )}

                {normalCount > 0 && (
                  <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-mono font-medium shadow-md">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>{normalCount} NORMAL</span>
                  </div>
                )}
              </div>
            );
          })()}

          {hasIntrusion && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-rose-950/90 border border-rose-500/80 text-rose-300 text-xs font-bold font-mono tracking-wide shadow-xl animate-bounce">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>ZONE INTRUSION</span>
            </div>
          )}
        </div>

        {isDrawingZone && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-zinc-900/95 border border-zinc-700 shadow-2xl">
            <Crosshair className="w-4 h-4 text-zinc-200 animate-spin" />
            <span className="text-xs font-medium text-zinc-200">Click to set boundary ({drawnPoints.length} points)</span>
            <div className="flex items-center gap-1.5 ml-2">
              {drawnPoints.length >= 3 && <button onClick={handleFinishZone} className="flex items-center gap-1 px-3 py-1 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold shadow transition-all"><Check className="w-3.5 h-3.5" /> Save</button>}
              {drawnPoints.length > 0 && <button onClick={handleUndoPoint} className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-all"><Undo className="w-3.5 h-3.5" /></button>}
              <button onClick={handleClearZone} className="p-1.5 rounded-xl bg-zinc-800 hover:bg-rose-900/50 text-zinc-400 border border-zinc-700 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
              <button onClick={onToggleDrawZone} className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border border-zinc-700 transition-all"><X className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        )}

        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          {enableBoundaryCheck && zonePolygonPoints && (
            <polygon points={zonePolygonPoints} fill={hasIntrusion ? "rgba(239, 68, 68, 0.18)" : "rgba(113, 113, 122, 0.12)"} stroke={hasIntrusion ? "#ef4444" : "#71717a"} strokeWidth="2" strokeDasharray={hasIntrusion ? "none" : "6,6"} />
          )}
          {isDrawingZone && drawnPoints.length > 0 && (
            <g>
              <polygon points={drawnPoints.map(([nx, ny]) => `${nx * containerDim.width},${ny * containerDim.height}`).join(" ")} fill="rgba(228, 228, 231, 0.15)" stroke="#e4e4e7" strokeWidth="2" strokeDasharray="4,4" />
              {drawnPoints.map(([nx, ny], i) => <circle key={i} cx={nx * containerDim.width} cy={ny * containerDim.height} r="5" fill="#ffffff" stroke="#18181b" strokeWidth="2" />)}
              {mousePos && <line x1={drawnPoints[drawnPoints.length - 1][0] * containerDim.width} y1={drawnPoints[drawnPoints.length - 1][1] * containerDim.height} x2={mousePos.x} y2={mousePos.y} stroke="#ffffff" strokeWidth="1.5" strokeDasharray="2,2" />}
            </g>
          )}
          {smoothObjects.map((obj, idx) => {
            const { x, y, w, h } = obj;
            const isIntruder = obj.in_restricted_zone && enableBoundaryCheck;
            const isSpeeding = obj.is_overspeeding;
            const isMasked = obj.is_masked;
            const isRunning = obj.is_running;
            const isVehicle = ["car", "truck", "bus", "motorcycle"].includes(obj.class);
            const isPerson = obj.class === "person";

            let strokeColor = "#71717a", fillColor = "rgba(113, 113, 122, 0.08)", badgeBg = "#18181b";
            if (isIntruder || isSpeeding) {
              strokeColor = "#ef4444";
              fillColor = "rgba(239, 68, 68, 0.20)";
              badgeBg = "#7f1d1d";
            } else if (isMasked) {
              strokeColor = "#a855f7";
              fillColor = "rgba(168, 85, 247, 0.16)";
              badgeBg = "#581c87";
            } else if (isRunning) {
              strokeColor = "#f59e0b";
              fillColor = "rgba(245, 158, 11, 0.16)";
              badgeBg = "#78350f";
            } else if (isVehicle) {
              // Calm Emerald for normal traffic flow
              strokeColor = "#10b981";
              fillColor = "rgba(16, 185, 129, 0.10)";
              badgeBg = "#064e3b";
            } else if (isPerson) {
              strokeColor = "#a1a1aa";
              fillColor = "rgba(161, 161, 170, 0.06)";
              badgeBg = "#27272a";
            }

            const cleanLbl = cleanLabelText(obj.label);
            const badgeWidth = Math.max(90, cleanLbl.length * 7.2 + 34);

            return (
              <g key={`bbox-${obj.tracking_id || idx}-${cleanLbl}`}>
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={isSpeeding ? "2.5" : isIntruder || isMasked ? "2.2" : "1.75"}
                  strokeDasharray={isSpeeding ? "4,2" : "none"}
                  rx="8"
                />
                <rect
                  x={Math.max(4, x)}
                  y={y > 28 ? y - 26 : y + h + 4}
                  width={badgeWidth}
                  height="22"
                  fill={badgeBg}
                  opacity="0.95"
                  rx="6"
                  stroke={strokeColor}
                  strokeWidth="1.2"
                />
                <text
                  x={Math.max(10, x + 8)}
                  y={y > 28 ? y - 10 : y + h + 19}
                  fill="#ffffff"
                  fontSize="11"
                  fontWeight={isSpeeding ? "700" : "600"}
                  fontFamily="Inter, sans-serif"
                >
                  {cleanLbl} <tspan fill="#d4d4d8" fontSize="10">[{Math.round(obj.confidence)}%]</tspan>
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex flex-col gap-3 pt-1">
        <div className="relative w-full h-3 bg-zinc-950 rounded-full border border-zinc-800 flex items-center cursor-pointer group shadow-inner">
          <input type="range" min="0" max={duration || 100} step="0.05" value={currentTime} onChange={(e) => onSeek(parseFloat(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
          <div className="h-full bg-zinc-200 rounded-full transition-all duration-75 pointer-events-none" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }} />
          {events.map((evt) => (
            <div key={`tick-${evt.id}`} className={`absolute top-0 bottom-0 w-1.5 rounded-full z-10 pointer-events-none ${evt.severity === "CRITICAL" || evt.severity === "HIGH" ? "bg-rose-500" : "bg-amber-400"}`} style={{ left: `${(evt.timestamp / (duration || 1)) * 100}%` }} title={`${evt.severity}: ${cleanLabelText(evt.title)}`} />
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-300">
          <div className="flex items-center gap-2.5 flex-wrap">
            <button onClick={() => onTogglePlay(!isPlaying)} className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold transition-all shadow-md">
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-zinc-950" />} <span>{isPlaying ? "Pause" : "Play"}</span>
            </button>
            <button onClick={onPrevAlert} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700/80 font-semibold transition-all shadow-sm">
              <SkipBack className="w-4 h-4 text-zinc-400" /> <span>Prev Incident</span>
            </button>
            <button onClick={onNextAlert} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700/80 font-semibold transition-all shadow-sm">
              <span>Next Incident</span> <SkipForward className="w-4 h-4 text-zinc-400" />
            </button>
            <div className="px-4 py-2 rounded-2xl bg-zinc-950 border border-zinc-800 text-zinc-200 font-mono font-bold">{formatTime(currentTime)} <span className="text-zinc-500">/</span> {formatTime(duration)}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-2xl border border-zinc-800">
              {[0.5, 1.0, 1.5, 2.0].map((s) => (
                <button key={s} onClick={() => handleSpeedChange(s)} className={`px-3 py-1 rounded-xl text-[11px] font-mono transition-all ${speed === s ? "bg-zinc-800 text-white border border-zinc-700 font-bold shadow-sm" : "text-zinc-400 hover:text-zinc-200"}`}>{s}x</button>
              ))}
            </div>
            <button onClick={() => containerRef.current?.requestFullscreen?.()} className="p-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border border-zinc-700 transition-all shadow-sm">
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono pt-1 border-t border-zinc-800/80">
          <div className="flex items-center gap-4 flex-wrap">
            <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">Space</kbd> Play/Pause</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">← / →</kbd> Prev/Next</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">F</kbd> Fullscreen</span>
          </div>
        </div>
      </div>
    </div>
  );
}
