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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg p-7 space-y-6 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <Crosshair className="w-5 h-5 text-zinc-300" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              Security Boundary Zones
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          Select a surveillance zone preset. When targets cross the boundary, the AI engine will immediately log an intrusion alert.
        </p>

        {/* Presets List */}
        <div className="space-y-2.5">
          {ZONE_PRESETS.map((preset, idx) => {
            const isSelected = JSON.stringify(preset.coords) === JSON.stringify(selectedZone);

            return (
              <button
                key={idx}
                onClick={() => setSelectedZone(preset.coords)}
                className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
                  isSelected
                    ? "bg-zinc-800 border-zinc-500 text-white shadow-md"
                    : "bg-zinc-950/80 border-zinc-800 text-zinc-300 hover:bg-zinc-850 hover:border-zinc-700"
                }`}
              >
                <div>
                  <p className="text-xs font-bold">{preset.name}</p>
                  <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
                    Boundary: [{preset.coords.map(c => `(${c[0]},${c[1]})`).join(", ")}]
                  </p>
                </div>
                {isSelected && <Check className="w-4 h-4 text-white" />}
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-xs font-semibold transition-all border border-zinc-700"
          >
            Cancel
          </button>
          <button
            onClick={() => onSaveZone(selectedZone)}
            className="px-5 py-2.5 rounded-2xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold shadow-lg transition-all"
          >
            Apply Boundary
          </button>
        </div>
      </div>
    </div>
  );
}
