import React from "react";
import { Camera, Radio } from "lucide-react";

export default function VideoSelectorBar({
  samples = [],
  activeVideoId,
  onSelectVideo
}) {
  const cleanTitle = (title) => {
    if (!title) return "Camera Feed";
    // Strip emojis for clean classy aesthetic
    return title.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
  };

  return (
    <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
      <div className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-xs font-bold text-zinc-400 flex-shrink-0 shadow-sm tracking-wider uppercase">
        <Radio className="w-4 h-4 text-zinc-300 animate-pulse" />
        <span>CHANNELS</span>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-0.5">
        {samples.map((sample, idx) => {
          const isActive = sample.id === activeVideoId;
          const camLabel = `CAM-${String(idx + 1).padStart(2, "0")}`;

          return (
            <button
              key={sample.id}
              onClick={() => onSelectVideo(sample.id)}
              className={`flex items-center gap-3 px-5 py-3 rounded-2xl border text-xs transition-all flex-shrink-0 shadow-sm ${
                isActive
                  ? "bg-zinc-800 border-zinc-500 text-white font-bold shadow-lg"
                  : "bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 hover:bg-zinc-850"
              }`}
            >
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold ${
                isActive ? "bg-zinc-700 text-zinc-100 border border-zinc-600" : "bg-zinc-950 text-zinc-500 border border-zinc-800"
              }`}>
                {camLabel}
              </span>
              <span className="font-medium">{cleanTitle(sample.title)}</span>
              {isActive && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
