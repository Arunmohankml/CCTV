import React, { useState, useMemo } from "react";
import { 
  AlertTriangle, 
  ShieldAlert, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  Clock, 
  Eye,
  Layers,
  Search,
  Activity,
  Zap
} from "lucide-react";

export default function AlertFeed({ events = [], currentTime, onSeekToTimestamp }) {
  const [filterSeverity, setFilterSeverity] = useState("ALL");
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const cleanText = (text) => {
    if (!text) return "";
    return text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
  };

  // De-duplicate and group alerts by Target Object / Entity
  const groupedAlerts = useMemo(() => {
    const groups = new Map();

    events.forEach((evt) => {
      const key = evt.object || evt.tracking_id ? `${evt.type}-${evt.object || evt.tracking_id}` : evt.id;

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          id: evt.id,
          title: cleanText(evt.title),
          description: cleanText(evt.description),
          object: cleanText(evt.object || "Target"),
          type: evt.type,
          severity: evt.severity || "CRITICAL",
          confidence: evt.confidence || 90.0,
          firstSeen: evt.timestamp,
          lastSeen: evt.timestamp,
          occurrences: [evt]
        });
      } else {
        const g = groups.get(key);
        g.occurrences.push(evt);
        if (evt.timestamp < g.firstSeen) g.firstSeen = evt.timestamp;
        if (evt.timestamp > g.lastSeen) g.lastSeen = evt.timestamp;
        if (evt.confidence > g.confidence) g.confidence = evt.confidence;
      }
    });

    return Array.from(groups.values()).sort((a, b) => b.lastSeen - a.lastSeen);
  }, [events]);

  const filteredGroups = useMemo(() => {
    return groupedAlerts.filter((g) => {
      if (filterSeverity !== "ALL" && g.severity !== filterSeverity) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          g.title.toLowerCase().includes(q) ||
          g.object.toLowerCase().includes(q) ||
          g.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [groupedAlerts, filterSeverity, searchQuery]);

  const toggleExpand = (key) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const formatTimestamp = (secs) => {
    if (secs == null || isNaN(secs)) return "00:00";
    const mins = Math.floor(secs / 60);
    const rem = Math.floor(secs % 60);
    return `${mins.toString().padStart(2, "0")}:${rem.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-[580px] bg-zinc-900/90 rounded-3xl border border-zinc-800 backdrop-blur-2xl shadow-2xl overflow-hidden">
      {/* Top Header */}
      <div className="p-4 px-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              Incident Alert Stream
            </h2>
            <p className="text-[11px] text-zinc-400 font-normal">
              {groupedAlerts.length} Entities • {events.length} Sightings
            </p>
          </div>
        </div>

        <span className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-semibold bg-rose-950/40 text-rose-300 border border-rose-800/60">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          Realtime Monitor
        </span>
      </div>

      {/* Filter Tabs & Search */}
      <div className="px-6 py-3 border-b border-zinc-800/80 bg-zinc-900/40 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {["ALL", "CRITICAL", "HIGH", "MEDIUM"].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                filterSeverity === sev
                  ? "bg-zinc-800 text-white border border-zinc-600 shadow-sm font-semibold"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850"
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search incident log..."
            className="text-xs px-3 pl-8 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-all w-44"
          />
        </div>
      </div>

      {/* Accordion Incident Cards List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
        {filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16 text-zinc-400 space-y-2">
            <Layers className="w-9 h-9 text-zinc-700 stroke-[1.5]" />
            <p className="text-sm font-medium text-zinc-300">No active incidents logged.</p>
            <p className="text-xs text-zinc-500">Perimeter status normal.</p>
          </div>
        ) : (
          filteredGroups.map((group) => {
            const isExpanded = expandedIds.has(group.key);
            const isLiveNow = Math.abs(currentTime - group.lastSeen) < 1.5;

            return (
              <div
                key={group.key}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isLiveNow
                    ? "bg-rose-950/20 border-rose-500/50 shadow-lg"
                    : isExpanded
                    ? "bg-zinc-850 border-zinc-700 shadow-md"
                    : "bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850/80"
                }`}
              >
                {/* Accordion Header Row */}
                <div
                  onClick={() => toggleExpand(group.key)}
                  className="p-4 cursor-pointer select-none flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      group.severity === "CRITICAL"
                        ? "bg-rose-950/60 text-rose-400 border border-rose-800/60"
                        : "bg-amber-950/60 text-amber-400 border border-amber-800/60"
                    }`}>
                      <AlertTriangle className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white">
                          {group.object}
                        </span>
                        <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                          group.severity === "CRITICAL"
                            ? "bg-rose-950/50 text-rose-300 border-rose-800/60"
                            : "bg-amber-950/50 text-amber-300 border-amber-800/60"
                        }`}>
                          {group.severity}
                        </span>
                        {group.occurrences.length > 1 && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                            {group.occurrences.length}x Sightings
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-zinc-400 mt-1 line-clamp-1 font-normal">
                        {group.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-zinc-200 block">
                        {formatTimestamp(group.lastSeen)}
                      </span>
                      {group.firstSeen !== group.lastSeen && (
                        <span className="text-[10px] font-mono text-zinc-500 block">
                          from {formatTimestamp(group.firstSeen)}
                        </span>
                      )}
                    </div>
                    
                    <button
                      type="button"
                      className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div className="px-5 pb-4 pt-2 border-t border-zinc-800 bg-zinc-950/50 space-y-3 text-xs">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>Confidence: <strong className="text-emerald-400 font-semibold">{group.confidence}%</strong></span>
                      <span>Target: <strong className="text-zinc-200 font-medium">{group.object}</strong></span>
                    </div>

                    {/* Sightings Timeline Breadcrumbs */}
                    <div>
                      <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide block mb-1.5">
                        Timeline Occurrences ({group.occurrences.length}):
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {group.occurrences.slice(0, 8).map((occ, idx) => (
                          <button
                            key={`${occ.id}-${idx}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSeekToTimestamp(occ.timestamp);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-mono text-zinc-200 hover:text-white transition-all shadow-sm"
                            title="Jump to this moment in video"
                          >
                            <Clock className="w-3.5 h-3.5 text-zinc-400" />
                            <span>{formatTimestamp(occ.timestamp)}</span>
                            <ExternalLink className="w-3 h-3 opacity-60" />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80">
                      <button
                        onClick={() => onSeekToTimestamp(group.lastSeen)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold transition-all shadow-md"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Jump to Sighting</span>
                      </button>

                      <span className="text-[11px] font-mono text-zinc-500">
                        {group.key}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
