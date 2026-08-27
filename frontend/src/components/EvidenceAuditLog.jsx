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

  const cleanText = (text) => {
    if (!text) return "";
    return text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
  };

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
      if (next.has(id)) next.delete(id);
      else next.add(id);
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

      ctx.fillStyle = 'rgba(24, 24, 27, 0.9)';
      ctx.fillRect(0, canvas.height - 48, canvas.width, 48);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      const timeStr = new Date().toUTCString();
      ctx.fillText(`SENTINEL FORENSIC EVIDENCE | CAM: ${videoTitle || 'CAM-01'} | TIME: ${timeStr} | TS: ${currentTime.toFixed(2)}s`, 20, canvas.height - 18);

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
    <div className='flex flex-col h-[580px] bg-zinc-900/90 rounded-3xl border border-zinc-800 backdrop-blur-2xl shadow-2xl overflow-hidden'>
      {/* Top Header */}
      <div className='p-4 px-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60'>
        <div className='flex items-center gap-3.5'>
          <div className='w-10 h-10 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center'>
            <FileText className='w-5 h-5 text-zinc-300' />
          </div>
          <div>
            <h2 className='text-xs font-bold text-white uppercase tracking-wider'>
              Forensic Audit Trail
            </h2>
            <p className='text-[11px] text-zinc-400 font-normal'>Chain of Custody Verification</p>
          </div>
        </div>

        <div className='flex items-center gap-2'>
          <button
            onClick={handleCaptureSnapshot}
            className='flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold transition-all shadow-sm'
            title='Capture current video frame as high-resolution evidence snapshot'
          >
            <Camera className='w-3.5 h-3.5 text-zinc-400' />
            <span>{snapshotSuccess ? 'Saved' : 'Snapshot'}</span>
          </button>

          <button
            onClick={handleExportJSON}
            className='flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold transition-all shadow-sm'
            title='Export full event log as JSON'
          >
            <Download className='w-3.5 h-3.5 text-zinc-400' />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className='px-6 py-3 border-b border-zinc-800/80 bg-zinc-900/40 flex items-center gap-1.5'>
        {[
          { id: 'ALL', label: 'All Logs' },
          { id: 'INTRUSIONS', label: 'Intrusions' },
          { id: 'ANPR', label: 'ANPR Plates' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filterType === tab.id
                ? "bg-zinc-800 text-white border border-zinc-600 shadow-sm font-semibold"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Audit Log Accordion Cards */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16 text-zinc-400 space-y-2">
            <Layers className="w-9 h-9 text-zinc-700 stroke-[1.5]" />
            <p className="text-sm font-medium text-zinc-300">No evidence records captured yet.</p>
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
                    ? "bg-zinc-800 border-zinc-600 shadow-md"
                    : isExpanded
                    ? "bg-zinc-850 border-zinc-700 shadow-md"
                    : "bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850/80"
                }`}
              >
                {/* Header Row */}
                <div
                  onClick={() => toggleExpand(evt.id || idx)}
                  className="p-4 cursor-pointer select-none flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 flex-shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white">
                          {cleanText(evt.title)}
                        </span>
                        <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                          evt.severity === "CRITICAL"
                            ? "bg-rose-950/50 text-rose-300 border-rose-800/60"
                            : "bg-zinc-800 text-zinc-300 border-zinc-700"
                        }`}>
                          {evt.severity || 'INFO'}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-400 mt-1 line-clamp-1 font-normal">
                        {cleanText(evt.description)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-mono font-bold text-zinc-300">
                      {formatTimestamp(evt.timestamp)}
                    </span>
                    <button
                      type="button"
                      className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-5 pb-4 pt-2 border-t border-zinc-800 bg-zinc-950/50 space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400 pt-1">
                      <div>Target: <strong className="text-zinc-200 font-medium">{cleanText(evt.object || 'N/A')}</strong></div>
                      <div>Confidence: <strong className="text-emerald-400 font-semibold">{evt.confidence || 90}%</strong></div>
                      <div>Event ID: <strong className="text-zinc-300 font-mono">{evt.id}</strong></div>
                      <div>Risk Level: <strong className="text-amber-400 font-semibold">{evt.risk_level || 'NORMAL'}</strong></div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80">
                      <button
                        onClick={() => onSeekToTimestamp(evt.timestamp)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold transition-all shadow-md"
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
