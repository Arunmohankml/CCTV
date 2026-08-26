import React from "react";
import { Video, Film } from "lucide-react";

export default function VideoSelectorBar({
  samples = [],
  activeVideoId,
  onSelectVideo
}) {
  return (
    <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800/80 text-sm font-semibold text-slate-300 flex-shrink-0 shadow-sm">
        <Video className="w-4 h-4 text-indigo-400" />
        <span className="tracking-wide">CAMERA FEEDS:</span>
      </div>

      <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-0.5">
        {samples.map((sample) => {
          const isActive = sample.id === activeVideoId;

          return (
            <button
              key={sample.id}
              onClick={() => onSelectVideo(sample.id)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border text-sm font-medium transition-all flex-shrink-0 ${
                isActive
                  ? "bg-indigo-600/15 border-indigo-500/60 text-white shadow-md font-semibold"
                  : "bg-slate-900/70 border-slate-800/80 text-slate-300 hover:text-white hover:border-slate-700 hover:bg-slate-800/70"
              }`}
            >
              <Film className={`w-4 h-4 ${isActive ? "text-indigo-400" : "text-slate-400"}`} />
              <span>{sample.title}</span>
              {isActive && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
