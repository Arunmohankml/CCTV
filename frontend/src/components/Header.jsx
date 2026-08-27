import React from "react";
import { Shield, Upload, Volume2, VolumeX, Crosshair, Radio, Activity } from "lucide-react";

export default function Header({
  onOpenUpload,
  onOpenZoneEditor,
  muted,
  onToggleMute,
  videoTitle,
  activeVideoId,
  enableBoundaryCheck,
  onToggleBoundaryCheck,
  isDrawingZone,
  onToggleDrawZone
}) {
  return (
    <header className="px-7 py-4 rounded-3xl bg-zinc-900/90 border border-zinc-800 backdrop-blur-2xl flex flex-wrap items-center justify-between gap-4 shadow-2xl">
      {/* Brand & System Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-800/80 border border-zinc-700/80 text-zinc-100 shadow-inner">
          <Shield className="w-6 h-6 stroke-[1.75]" />
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              <span className="tracking-wider uppercase text-xs font-semibold text-zinc-400">SENTINEL</span>
              <span className="text-white font-extrabold text-lg">CCTV AI</span>
            </h1>
            <span className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-zinc-800/90 text-zinc-300 border border-zinc-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Surveillance
            </span>
          </div>
          {videoTitle && (
            <p className="text-xs text-zinc-400 font-normal line-clamp-1 mt-0.5">
              Active Channel: <span className="text-zinc-200 font-medium">{videoTitle}</span>
            </p>
          )}
        </div>
      </div>

      {/* Minimal Action Toolset */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Draw Custom Zone Button */}
        <button
          onClick={onToggleDrawZone}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl border text-xs font-semibold transition-all shadow-sm ${
            isDrawingZone
              ? "bg-zinc-100 text-zinc-950 border-white shadow-md animate-pulse"
              : "bg-zinc-850 hover:bg-zinc-800 text-zinc-200 border-zinc-700/80 hover:border-zinc-600"
          }`}
          title="Click on the video to draw a custom boundary polygon (Shortcut: Z)"
        >
          <Crosshair className="w-4 h-4" />
          <span>{isDrawingZone ? "Drawing Active" : "Draw Zone (Z)"}</span>
        </button>

        {/* Zone Check Toggle Button */}
        <button
          onClick={onToggleBoundaryCheck}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl border text-xs font-semibold transition-all shadow-sm ${
            enableBoundaryCheck
              ? "bg-zinc-800 text-zinc-100 border-zinc-600"
              : "bg-zinc-900/60 border-zinc-800 text-zinc-500 hover:text-zinc-300"
          }`}
          title="Toggle restricted boundary breach checks"
        >
          <Activity className="w-4 h-4" />
          <span>Boundary Radar: {enableBoundaryCheck ? "ON" : "OFF"}</span>
        </button>

        {/* Audio Mute Toggle */}
        <button
          onClick={onToggleMute}
          className={`p-3 rounded-2xl border text-xs transition-all shadow-sm ${
            muted
              ? "bg-zinc-900 border-zinc-800 text-zinc-600 hover:text-zinc-400"
              : "bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-750"
          }`}
          title={muted ? "Unmute Alarm Sounds (Shortcut: M)" : "Mute Alarm Sounds (Shortcut: M)"}
        >
          {muted ? <VolumeX className="w-4 h-4 text-zinc-500" /> : <Volume2 className="w-4 h-4 text-zinc-200" />}
        </button>

        {/* Upload Video Button */}
        <button
          onClick={onOpenUpload}
          className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs shadow-lg transition-all border border-zinc-200"
        >
          <Upload className="w-4 h-4 text-zinc-900" />
          <span>Upload CCTV</span>
        </button>
      </div>
    </header>
  );
}
