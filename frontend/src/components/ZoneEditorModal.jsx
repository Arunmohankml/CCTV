import React, { useState } from "react";
import { Crosshair, Check, X, ShieldAlert } from "lucide-react";

const ZONE_PRESETS = [
  {
    name: "Center Perimeter (Default)",
    coords: [[0.25, 0.25], [0.75, 0.25], [0.75, 0.75], [0.25, 0.75]]
  },
  {
    name: "Lower Entryway Corridor",
    coords: [[0.1, 0.4], [0.9, 0.4], [0.9, 0.9], [0.1, 0.9]]
  },
  {
    name: "Left Guard Gate",
    coords: [[0.05, 0.1], [0.45, 0.1], [0.45, 0.9], [0.05, 0.9]]
  },
  {
    name: "Right Parking Corridor",
    coords: [[0.55, 0.1], [0.95, 0.1], [0.95, 0.9], [0.55, 0.9]]
  }
];

export default function ZoneEditorModal({ isOpen, onClose, currentZone, onSaveZone }) {
  const [selectedZone, setSelectedZone] = useState(currentZone || ZONE_PRESETS[0].coords);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-lg p-6 space-y-5 border-cyan-800/60 shadow-2xl relative">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Crosshair className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Configure Restricted Security Zone
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Select a surveillance zone preset. When objects cross the boundary, the AI engine will immediately log a <strong>CRITICAL RESTRICTED ZONE INTRUSION</strong> alert and sound the security alarm.
        </p>

        {/* Presets List */}
        <div className="space-y-2">
          {ZONE_PRESETS.map((preset, idx) => {
            const isSelected = JSON.stringify(preset.coords) === JSON.stringify(selectedZone);

            return (
              <button
                key={idx}
                onClick={() => setSelectedZone(preset.coords)}
                className={`w-full p-3 rounded-lg border text-left flex items-center justify-between transition-all ${
                  isSelected
                    ? "bg-cyan-950/70 border-cyan-500 text-cyan-300"
                    : "bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-850"
                }`}
              >
                <div>
                  <p className="text-xs font-bold">{preset.name}</p>
                  <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                    Polygon Coords: [{preset.coords.map(c => `(${c[0]},${c[1]})`).join(", ")}]
                  </p>
                </div>
                {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => onSaveZone(selectedZone)}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium shadow-lg shadow-cyan-900/30 transition-all border border-cyan-400/30"
          >
            Apply & Re-analyze Video
          </button>
        </div>
      </div>
    </div>
  );
}
