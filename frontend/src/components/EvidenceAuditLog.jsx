import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Camera, 
  Download, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Layers,
  ExternalLink 
} from 'lucide-react';

export default function EvidenceAuditLog({ events = [], currentTime, onSeekToTimestamp, videoTitle }) {
  const [filterType, setFilterType] = useState('ALL');
  const [snapshotSuccess, setSnapshotSuccess] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState(new Set());

  const filteredEvents = useMemo(() => {
    return (events || []).filter((e) => {
      if (filterType === 'ALL') return true;
      if (filterType === 'INTRUSIONS') return e.type === 'restricted_zone_intrusion';
      if (filterType === 'ANPR') return e.type === 'license_plate_scanned';
      return true;
    });
  }, [events, filterType]);

  const toggleExpand = (id) => {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCaptureSnapshot = () => {
    const video = document.querySelector('video');
    if (!video) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Watermark with CCTV Evidence Header
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, canvas.height - 48, canvas.width, 48);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      const timeStr = new Date().toUTCString();
      ctx.fillText(`SENTINEL CCTV EVIDENCE | CAM: ${videoTitle || 'CAM-01'} | TIME: ${timeStr} | TS: ${currentTime.toFixed(2)}s`, 20, canvas.height - 18);

      // Trigger download
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.download = `cctv_evidence_${Math.floor(currentTime)}s.jpg`;
      link.href = dataUrl;
      link.click();

      setSnapshotSuccess(true);
      setTimeout(() => setSnapshotSuccess(false), 3000);
    } catch (err) {
      console.error('Snapshot capture error:', err);
    }
  };

  const handleExportJSON = () => {
    const exportData = {
      feed_title: videoTitle || 'CAM-01',
      exported_at: new Date().toISOString(),
      total_events: events.length,
      events: events
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `sentinel_audit_log_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchor.click();
  };

  const formatTimestamp = (secs) => {
    if (secs === undefined || isNaN(secs)) return "00:00";
    const mins = Math.floor(secs / 60);
    const rem = Math.floor(secs % 60);
    return `${mins.toString().padStart(2, "0")}:${rem.toString().padStart(2, "0")}`;
  };

  return (
    <div className='flex flex-col h-[580px] bg-slate-900/90 rounded-2xl border border-slate-800/80 backdrop-blur-xl shadow-xl overflow-hidden'>
      {/* Top Header */}
      <div className='p-4 px-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60'>
        <div className='flex items-center gap-3'>
          <div className='w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center'>
            <FileText className='w-5 h-5 text-indigo-400' />
          </div>
          <div>
            <h2 className='text-sm font-bold text-white tracking-wide'>
              Evidence Audit Log
            </h2>
            <p className='text-xs text-slate-400 font-normal'>Forensic Chain of Custody</p>
          </div>
        </div>

        <div className='flex items-center gap-2'>
          <button
            onClick={handleCaptureSnapshot}
            className='flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-xs font-semibold transition-all shadow-sm'
            title='Capture current video frame as high-resolution evidence snapshot'
          >
            <Camera className='w-3.5 h-3.5 text-indigo-400' />
            <span>{snapshotSuccess ? 'Saved!' : 'Snapshot'}</span>
          </button>

          <button
            onClick={handleExportJSON}
            className='flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-xs font-semibold transition-all shadow-sm'
            title='Export full event log as JSON'
          >
            <Download className='w-3.5 h-3.5 text-slate-400' />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className='px-5 py-3 border-b border-slate-800/60 bg-slate-900/40 flex items-center gap-1.5'>
        {[
          { id: 'ALL', label: 'All Logs' },
          { id: 'INTRUSIONS', label: 'Intrusions' },
          { id: 'ANPR', label: 'ANPR Plates' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id)}
            className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${
              filterType === tab.id
                ? "bg-slate-800 text-white border border-slate-700 shadow-sm font-semibold"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Audit Log Accordion Cards */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16 text-slate-400 space-y-2">
            <Layers className="w-9 h-9 text-slate-600 stroke-[1.5]" />
            <p className="text-sm font-medium text-slate-300">No evidence records captured yet.</p>
          </div>
        ) : (
          filteredEvents.map((evt, idx) => {
            const isExpanded = expandedLogs.has(evt.id || idx);
            const isCurrent = Math.abs(currentTime - evt.timestamp) < 1.5;

            return (
              <div
                key={evt.id || idx}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isCurrent
                    ? "bg-indigo-950/20 border-indigo-500/50 shadow-md"
                    : isExpanded
                    ? "bg-slate-850 border-slate-700 shadow-md"
                    : "bg-slate-900/80 border-slate-800/80 hover:border-slate-700 hover:bg-slate-850/80"
                }`}
              >
                {/* Header Row */}
                <div
                  onClick={() => toggleExpand(evt.id || idx)}
                  className="p-3.5 cursor-pointer select-none flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 w-7 h-7 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white">
                          {evt.title}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          evt.severity === "CRITICAL"
                            ? "bg-rose-500/10 text-rose-300 border-rose-500/20"
                            : "bg-indigo-500/10 text-indigo-300 border-indigo-500/20"
                        }`}>
                          {evt.severity || 'INFO'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 mt-1 line-clamp-1 font-normal">
                        {evt.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-mono font-semibold text-slate-300">
                      {formatTimestamp(evt.timestamp)}
                    </span>
                    <button
                      type="button"
                      className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-3.5 pt-2 border-t border-slate-800/80 bg-slate-950/40 space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-1">
                      <div>Target: <strong className="text-slate-200 font-medium">{evt.object || 'N/A'}</strong></div>
                      <div>Confidence: <strong className="text-emerald-400 font-semibold">{evt.confidence || 90}%</strong></div>
                      <div>Event ID: <strong className="text-slate-300 font-mono">{evt.id}</strong></div>
                      <div>Risk Level: <strong className="text-amber-400 font-semibold">{evt.risk_level || 'NORMAL'}</strong></div>
                    </div>

                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/60">
                      <button
                        onClick={() => onSeekToTimestamp(evt.timestamp)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-sm"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Jump to Frame</span>
                      </button>
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
