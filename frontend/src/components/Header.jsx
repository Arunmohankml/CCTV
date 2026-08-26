import React from "react";
import { Shield, Upload, Volume2, VolumeX, Crosshair } from "lucide-react";

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
    <header className="px-6 py-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
      {/* Brand & System Status */}
      <div className="flex items-center gap-3.5">
        <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 shadow-sm">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>Sentinel</span>
              <span className="text-indigo-400 font-extrabold">AI</span>
            </h1>
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Monitor
            </span>
          </div>
          {videoTitle && (
            <p className="text-sm text-slate-400 font-normal line-clamp-1 mt-0.5">
              Active Camera: <span className="text-slate-200 font-medium">{videoTitle}</span>
            </p>
          )}
        </div>
      </div>

      {/* Minimal Action Toolset */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Draw Custom Zone Button */}
        <button
          onClick={onToggleDrawZone}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-semibold transition-all ${
            isDrawingZone
              ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-md animate-pulse"
              : "bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border-slate-700/80"
          }`}
          title="Click on the video to draw a custom boundary polygon"
        >
          <Crosshair className={`w-4 h-4 ${isDrawingZone ? "text-amber-400" : "text-indigo-400"}`} />
          <span>{isDrawingZone ? "Drawing Mode Active" : "Draw Zone"}</span>
        </button>

        {/* Zone Check Toggle Button */}
        <button
          onClick={onToggleBoundaryCheck}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-semibold transition-all ${
            enableBoundaryCheck
              ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-300"
              : "bg-slate-800/60 border-slate-700/80 text-slate-400 hover:text-slate-200"
          }`}
          title="Toggle restricted boundary breach checks"
        >
          <Shield className={`w-4 h-4 ${enableBoundaryCheck ? "text-indigo-400" : "text-slate-500"}`} />
          <span>Zone Detection: {enableBoundaryCheck ? "ON" : "OFF"}</span>
        </button>

        {/* Audio Mute Toggle */}
        <button
          onClick={onToggleMute}
          className={`p-2.5 rounded-xl border text-xs transition-all ${
            muted
              ? "bg-slate-800/50 border-slate-700/60 text-slate-500 hover:text-slate-300"
              : "bg-slate-800/90 border-slate-700/80 text-slate-200 hover:bg-slate-700/90"
          }`}
          title={muted ? "Unmute Alarm Sounds" : "Mute Alarm Sounds"}
        >
          {muted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-indigo-400" />}
        </button>

        {/* Upload Video Button */}
        <button
          onClick={onOpenUpload}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-950/40 transition-all border border-indigo-500/50"
        >
          <Upload className="w-4 h-4" />
          <span>Upload CCTV</span>
        </button>
      </div>
    </header>
  );
}
