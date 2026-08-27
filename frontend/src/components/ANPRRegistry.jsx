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
      const num = (item.plate_number || '').trim();
      if (!num || num === 'NIL' || num === 'UNKNOWN' || num === 'NOT VISIBLE / NIL') return;
      
      if (!map.has(num)) {
        map.set(num, {
          plate_number: num,
          vehicle_type: item.vehicle_type || 'Vehicle',
          tracking_id: item.tracking_id,
          status: item.status || 'VERIFIED',
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
      if (next.has(plateNum)) next.delete(plateNum);
      else next.add(plateNum);
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
    <div className='flex flex-col h-[580px] bg-zinc-900/90 rounded-3xl border border-zinc-800 backdrop-blur-2xl shadow-2xl overflow-hidden'>
      {/* Top Header */}
      <div className='p-4 px-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60'>
        <div className='flex items-center gap-3.5'>
          <div className='w-10 h-10 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center'>
            <Car className='w-5 h-5 text-zinc-300' />
          </div>
          <div>
            <h2 className='text-xs font-bold text-white uppercase tracking-wider'>
              License Plate Records
            </h2>
            <p className='text-[11px] text-zinc-400 font-normal'>
              {groupedPlates.length} Unique Vehicles • {plateRegistry.length} Scans
            </p>
          </div>
        </div>

        <span className='text-[11px] font-semibold text-zinc-300 px-3.5 py-1.5 rounded-full bg-zinc-800 border border-zinc-700'>
          {groupedPlates.length} Registered
        </span>
      </div>

      {/* Search Input */}
      <div className='px-6 py-3 border-b border-zinc-800/80 bg-zinc-900/40'>
        <div className='relative'>
          <Search className='w-4 h-4 absolute left-3.5 top-3 text-zinc-500' />
          <input
            type='text'
            placeholder='Search license plate (e.g. BG65 USJ, NA54 KGJ)...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-medium text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors'
          />
        </div>
      </div>

      {/* Plate Accordion Cards List */}
      <div className='flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar'>
        {filteredPlates.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-full text-center py-16 text-zinc-400 space-y-2'>
            <Layers className='w-9 h-9 text-zinc-700 stroke-[1.5]' />
            <p className='text-sm font-medium text-zinc-300'>No license plates matching query.</p>
          </div>
        ) : (
          filteredPlates.map((item) => {
            const isExpanded = expandedPlates.has(item.plate_number);
            const isLiveNow = Math.abs(currentTime - item.lastSeen) < 1.5;

            return (
              <div
                key={item.plate_number}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isLiveNow
                    ? "bg-zinc-800 border-zinc-600 shadow-md"
                    : isExpanded
                    ? "bg-zinc-850 border-zinc-700 shadow-md"
                    : "bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850/80"
                }`}
              >
                {/* Plate Card Header Row */}
                <div
                  onClick={() => toggleExpand(item.plate_number)}
                  className='p-4 cursor-pointer select-none flex items-center justify-between gap-3'
                >
                  <div className='flex items-center gap-3 min-w-0'>
                    {/* Visual Plate License Pill */}
                    <div className='flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-100 font-mono font-bold text-xs tracking-wider shadow-inner'>
                      <Hash className='w-3.5 h-3.5 text-zinc-400' />
                      <span>{item.plate_number}</span>
                    </div>

                    <span className='text-[10px] font-semibold px-2.5 py-0.5 rounded-full border bg-zinc-800 text-zinc-300 border-zinc-700'>
                      {item.status || 'VERIFIED'}
                    </span>

                    {item.occurrences.length > 1 && (
                      <span className='text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700'>
                        {item.occurrences.length}x
                      </span>
                    )}
                  </div>

                  <div className='flex items-center gap-2 flex-shrink-0'>
                    <span className='text-xs font-mono font-bold text-zinc-300 block'>
                      {formatTimestamp(item.lastSeen)}
                    </span>

                    <button
                      type='button'
                      className='p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors'
                    >
                      {isExpanded ? <ChevronUp className='w-4 h-4' /> : <ChevronDown className='w-4 h-4' />}
                    </button>
                  </div>
                </div>

                {/* Expanded Plate History & Metadata */}
                {isExpanded && (
                  <div className='px-5 pb-4 pt-2 border-t border-zinc-800 bg-zinc-950/50 space-y-3 text-xs'>
                    <div className='flex items-center justify-between text-xs text-zinc-400'>
                      <span>Vehicle: <strong className='text-zinc-200 font-medium'>{item.vehicle_type} #{item.tracking_id}</strong></span>
                      <span>Confidence: <strong className='text-emerald-400 font-semibold'>{item.confidence}%</strong></span>
                    </div>

                    {/* Sightings Timeline Breadcrumbs */}
                    <div>
                      <span className='text-[11px] font-medium text-zinc-400 uppercase tracking-wide block mb-1.5'>
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
                            className='flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-mono text-zinc-200 hover:text-white transition-all shadow-sm'
                            title='Jump to this moment in video'
                          >
                            <Clock className='w-3.5 h-3.5 text-zinc-400' />
                            <span>{formatTimestamp(occ.timestamp)}</span>
                            <ExternalLink className='w-3 h-3 opacity-60' />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className='flex items-center justify-between pt-3 border-t border-zinc-800/80'>
                      <button
                        onClick={() => onSeekToTimestamp(item.lastSeen)}
                        className='flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold transition-all shadow-md'
                      >
                        <Eye className='w-3.5 h-3.5' />
                        <span>Jump to Vehicle</span>
                      </button>

                      <span className='text-[11px] font-mono text-zinc-500'>
                        Track #{item.tracking_id}
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
