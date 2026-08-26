import React, { useState } from "react";
import { Search, Download, ExternalLink, ShieldAlert, History, Filter } from "lucide-react";

export default function EventHistory({ events = [], onSeekToTimestamp }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("ALL");

  const filteredEvents = events.filter((evt) => {
    const matchesSearch =
      evt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evt.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evt.object.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSeverity =
      selectedSeverity === "ALL" || evt.severity === selectedSeverity;

    return matchesSearch && matchesSeverity;
  });

  const formatTimestamp = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(events, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `sentinel-cctv-events-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getSeverityBadgeClass = (severity) => {
    switch (severity) {
      case "CRITICAL":
        return "badge-critical";
      case "HIGH":
        return "badge-high";
      case "MEDIUM":
        return "badge-medium";
      default:
        return "badge-info";
    }
  };

  return (
    <div className="glass-panel p-5 space-y-4">
      {/* Header & Export Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Surveillance Event History Log
            </h2>
            <p className="text-xs text-slate-400">
              Complete chronological audit trail of AI-detected security events.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-all border border-slate-700"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export JSON Log</span>
          </button>
        </div>
      </div>

      {/* Search & Severity Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search events, objects (e.g. Person #12)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 focus:border-cyan-500 text-xs font-mono text-slate-200 focus:outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-1">
          {["ALL", "CRITICAL", "HIGH", "MEDIUM", "INFO"].map((sev) => (
            <button
              key={sev}
              onClick={() => setSelectedSeverity(sev)}
              className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
                selectedSeverity === sev
                  ? "bg-cyan-950 text-cyan-300 border border-cyan-700"
                  : "text-slate-400 hover:text-slate-200 bg-slate-900/60"
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Events Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <th className="p-3">Time</th>
              <th className="p-3">Severity</th>
              <th className="p-3">Event Description</th>
              <th className="p-3">Target Object</th>
              <th className="p-3">Confidence</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-500 font-mono text-xs">
                  No matching events found in audit history.
                </td>
              </tr>
            ) : (
              filteredEvents.map((evt) => (
                <tr
                  key={evt.id}
                  className="hover:bg-slate-800/50 transition-colors group cursor-pointer"
                  onClick={() => onSeekToTimestamp(evt.timestamp)}
                >
                  <td className="p-3 text-cyan-400 font-bold">
                    {formatTimestamp(evt.timestamp)}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getSeverityBadgeClass(evt.severity)}`}>
                      {evt.severity}
                    </span>
                  </td>
                  <td className="p-3">
                    <p className="font-bold text-slate-200 group-hover:text-cyan-300">{evt.title}</p>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{evt.description}</p>
                  </td>
                  <td className="p-3 text-slate-200 font-semibold">{evt.object}</td>
                  <td className="p-3 text-cyan-400 font-bold">{evt.confidence}%</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSeekToTimestamp(evt.timestamp);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 text-[11px] font-medium transition-all"
                    >
                      <span>Seek Video</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
