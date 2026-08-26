import React, { useState, useMemo } from 'react';
import { 
  Car, 
  Search, 
  Hash, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Eye,
  Layers,
  ExternalLink 
} from 'lucide-react';

export default function ANPRRegistry({ plateRegistry = [], currentTime, onSeekToTimestamp }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPlates, setExpandedPlates] = useState(new Set());

  // De-duplicate plates by plate_number
  const groupedPlates = useMemo(() => {
    const map = new Map();

    (plateRegistry || []).forEach((item) => {
      const num = item.plate_number || 'UNKNOWN';
      if (!map.has(num)) {
        map.set(num, {
          plate_number: num,
          vehicle_type: item.vehicle_type || 'Vehicle',
          tracking_id: item.tracking_id,
          status: item.status || 'UNAUTHORIZED',
          confidence: item.confidence || 92.0,
          firstSeen: item.timestamp,
          lastSeen: item.timestamp,
          occurrences: [item]
        });
      } else {
        const p = map.get(num);
        p.occurrences.push(item);
        if (item.timestamp < p.firstSeen) p.firstSeen = item.timestamp;
        if (item.timestamp > p.lastSeen) p.lastSeen = item.timestamp;
        if (item.confidence > p.confidence) p.confidence = item.confidence;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.lastSeen - a.lastSeen);
  }, [plateRegistry]);

  const filteredPlates = useMemo(() => {
    if (!searchTerm.trim()) return groupedPlates;
    const term = searchTerm.toLowerCase();
    return groupedPlates.filter((p) => (
      p.plate_number.toLowerCase().includes(term) ||
      p.vehicle_type.toLowerCase().includes(term) ||
      p.status.toLowerCase().includes(term)
    ));
  }, [groupedPlates, searchTerm]);

  const toggleExpand = (plateNum) => {
    setExpandedPlates((prev) => {
      const next = new Set(prev);
      if (next.has(plateNum)) {
        next.delete(plateNum);
      } else {
        next.add(plateNum);
      }
      return next;
    });
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
          <div className='w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center'>
            <Car className='w-5 h-5 text-emerald-400' />
          </div>
          <div>
            <h2 className='text-sm font-bold text-white tracking-wide'>
              ANPR Plate Registry
            </h2>
            <p className='text-xs text-slate-400 font-normal'>
              {groupedPlates.length} Unique Vehicles • {plateRegistry.length} Scans
            </p>
          </div>
        </div>

        <span className='text-xs font-semibold text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20'>
          {groupedPlates.length} Registered
        </span>
      </div>

      {/* Search Input */}
      <div className='px-5 py-3 border-b border-slate-800/60 bg-slate-900/40'>
        <div className='relative'>
          <Search className='w-4 h-4 absolute left-3 top-2.5 text-slate-500' />
          <input
            type='text'
            placeholder='Search license plate (e.g. DL-08), vehicle...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800/90 border border-slate-700/80 text-xs font-medium text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors'
          />
        </div>
      </div>

      {/* Plate Accordion Cards List */}
      <div className='flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar'>
        {filteredPlates.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-full text-center py-16 text-slate-400 space-y-2'>
            <Layers className='w-9 h-9 text-slate-600 stroke-[1.5]' />
            <p className='text-sm font-medium text-slate-300'>No license plates detected matching search.</p>
          </div>
        ) : (
          filteredPlates.map((item) => {
            const isExpanded = expandedPlates.has(item.plate_number);
            const isLiveNow = Math.abs(currentTime - item.lastSeen) < 1.5;
            const isAuthorized = item.status.includes('AUTHORIZED') && !item.status.includes('UNAUTHORIZED');

            return (
              <div
                key={item.plate_number}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isLiveNow
                    ? "bg-emerald-950/20 border-emerald-500/50 shadow-md"
                    : isExpanded
                    ? "bg-slate-850 border-slate-700 shadow-md"
                    : "bg-slate-900/80 border-slate-800/80 hover:border-slate-700 hover:bg-slate-850/80"
                }`}
              >
                {/* Plate Card Header Row */}
                <div
                  onClick={() => toggleExpand(item.plate_number)}
                  className='p-3.5 cursor-pointer select-none flex items-center justify-between gap-3'
                >
                  <div className='flex items-center gap-3 min-w-0'>
                    {/* Visual Plate License Pill */}
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border ${
                      item.plate_number === 'NIL' 
                        ? 'border-slate-700 text-slate-400' 
                        : 'border-emerald-500 text-emerald-300'
                    } font-mono font-bold text-xs tracking-wider shadow-sm`}>
                      <Hash className={`w-3.5 h-3.5 ${item.plate_number === 'NIL' ? 'text-slate-500' : 'text-emerald-400'}`} />
                      <span>{item.plate_number}</span>
                    </div>

                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        item.plate_number === 'NIL'
                          ? 'bg-slate-800 text-slate-400 border-slate-700'
                          : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                      }`}
                    >
                      {item.plate_number === 'NIL' ? 'NOT VISIBLE' : (item.status || 'VERIFIED')}
                    </span>

                    {item.occurrences.length > 1 && (
                      <span className='text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700'>
                        {item.occurrences.length}x Scans
                      </span>
                    )}
                  </div>

                  <div className='flex items-center gap-2 flex-shrink-0'>
                    <span className='text-xs font-mono font-semibold text-slate-300 block'>
                      {formatTimestamp(item.lastSeen)}
                    </span>

                    <button
                      type='button'
                      className='p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors'
                    >
                      {isExpanded ? <ChevronUp className='w-4 h-4' /> : <ChevronDown className='w-4 h-4' />}
                    </button>
                  </div>
                </div>

                {/* Expanded Plate History & Metadata */}
                {isExpanded && (
                  <div className='px-4 pb-3.5 pt-2 border-t border-slate-800/80 bg-slate-950/40 space-y-3 text-xs'>
                    <div className='flex items-center justify-between text-xs text-slate-400'>
                      <span>Vehicle: <strong className='text-slate-200 font-medium'>{item.vehicle_type} #{item.tracking_id}</strong></span>
                      <span>OCR Confidence: <strong className='text-emerald-400 font-semibold'>{item.confidence}%</strong></span>
                    </div>

                    {/* Sightings Timeline Breadcrumbs */}
                    <div>
                      <span className='text-[11px] font-medium text-slate-400 uppercase tracking-wide block mb-1.5'>
                        Sighting History ({item.occurrences.length}):
                      </span>
                      <div className='flex flex-wrap gap-2'>
                        {item.occurrences.slice(0, 8).map((occ, idx) => (
                          <button
                            key={`${occ.timestamp}-${idx}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSeekToTimestamp(occ.timestamp);
                            }}
                            className='flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-emerald-600 border border-slate-700/80 hover:border-emerald-500 text-xs font-mono text-slate-300 hover:text-white transition-all shadow-sm'
                            title='Jump to this moment in video'
                          >
                            <Clock className='w-3 h-3 text-emerald-400' />
                            <span>{formatTimestamp(occ.timestamp)}</span>
                            <ExternalLink className='w-3 h-3 opacity-60' />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className='flex items-center justify-between pt-2.5 border-t border-slate-800/60'>
                      <button
                        onClick={() => onSeekToTimestamp(item.lastSeen)}
                        className='flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-sm'
                      >
                        <Eye className='w-3.5 h-3.5' />
                        <span>Jump to Vehicle</span>
                      </button>

                      <span className='text-[11px] font-mono text-slate-500'>
                        Record #{item.tracking_id}
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
