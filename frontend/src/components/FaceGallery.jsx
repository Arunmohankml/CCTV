import React, { useState, useMemo } from 'react';
import { 
  UserCheck, 
  Search, 
  Trash2, 
  Download, 
  Clock, 
  Eye, 
  ShieldAlert, 
  Camera
} from 'lucide-react';

export default function FaceGallery({ faces = [], currentTime, onSeekToTimestamp, onClearFaces }) {
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Strictly de-duplicate faces by tracking_id so each person has 1 master card
  const uniqueFaces = useMemo(() => {
    const map = new Map();
    (faces || []).forEach((face) => {
      const id = face.tracking_id || face.id;
      if (!map.has(id)) {
        map.set(id, { ...face, occurrences: face.occurrences || 1 });
      } else {
        const existing = map.get(id);
        existing.occurrences = Math.max(existing.occurrences, face.occurrences || 1);
        if (face.timestamp > existing.timestamp) existing.timestamp = face.timestamp;
        if (face.in_restricted_zone) existing.in_restricted_zone = true;
        if (face.is_running) existing.is_running = true;
        if (face.image_url && (!existing.image_url || face.confidence >= existing.confidence)) {
          existing.image_url = face.image_url;
          existing.confidence = face.confidence;
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
  }, [faces]);

  const filteredFaces = useMemo(() => {
    return uniqueFaces.filter((f) => {
      if (filterType === 'BREACHES' && !f.in_restricted_zone && !f.is_running && !f.is_masked) return false;
      if (filterType === 'MASKED' && !f.is_masked) return false;
      if (filterType === 'NORMAL' && (f.in_restricted_zone || f.is_running || f.is_masked)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (f.label && f.label.toLowerCase().includes(q)) ||
          String(f.tracking_id).includes(q)
        );
      }
      return true;
    });
  }, [uniqueFaces, filterType, searchQuery]);

  const formatTimestamp = (secs) => {
    if (secs === undefined || isNaN(secs)) return '00:00';
    const mins = Math.floor(secs / 60);
    const rem = Math.floor(secs % 60);
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  const handleDownloadFace = (face) => {
    if (!face.image_url) return;
    const link = document.createElement('a');
    link.href = face.image_url;
    link.download = `face_capture_${String(face.label || 'subject').replace(/\s+/g, '_')}_${Math.floor(face.timestamp)}s.jpg`;
    link.click();
  };

  return (
    <div className='flex flex-col h-[580px] bg-slate-900/90 rounded-2xl border border-slate-800/80 backdrop-blur-xl shadow-xl overflow-hidden'>
      {/* Top Header */}
      <div className='p-4 px-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60'>
        <div className='flex items-center gap-3'>
          <div className='w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center'>
            <UserCheck className='w-5 h-5 text-sky-400' />
          </div>
          <div>
            <h2 className='text-sm font-bold text-white tracking-wide'>
              Faces Found
            </h2>
            <p className='text-xs text-slate-400 font-normal'>
              {uniqueFaces.length} Unique Subjects Captured
            </p>
          </div>
        </div>

        <div className='flex items-center gap-2'>
          {uniqueFaces.length > 0 && onClearFaces && (
            <button
              onClick={onClearFaces}
              className='flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-700/80 text-xs font-semibold transition-all shadow-sm'
              title='Clear captured face gallery'
            >
              <Trash2 className='w-3.5 h-3.5' />
              <span>Clear</span>
            </button>
          )}

          <span className='text-xs font-semibold text-sky-400 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20'>
            {uniqueFaces.length} Faces
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className='px-5 py-3 border-b border-slate-800/60 flex items-center justify-between gap-3 bg-slate-900/40'>
        <div className='flex items-center gap-1.5 overflow-x-auto no-scrollbar'>
          {['ALL', 'BREACHES', 'MASKED', 'NORMAL'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                filterType === type
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className='relative flex items-center'>
          <Search className='w-3.5 h-3.5 text-slate-500 absolute left-2.5 pointer-events-none' />
          <input
            type='text'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder='Search subject...'
            className='text-xs px-3 pl-8 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700/80 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-all w-32 sm:w-40'
          />
        </div>
      </div>

      {/* Faces Gallery Grid */}
      <div className='flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar'>
        {filteredFaces.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-full text-center py-16 text-slate-400 space-y-2'>
            <Camera className='w-9 h-9 text-slate-600 stroke-[1.5]' />
            <p className='text-sm font-medium text-slate-300'>No human faces captured yet.</p>
            <p className='text-xs text-slate-500'>Zoomed face snapshots will appear here as persons appear in CCTV.</p>
          </div>
        ) : (
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3.5'>
            {filteredFaces.map((face) => {
              const isLiveNow = Math.abs(currentTime - face.timestamp) < 1.5;

              return (
                <div
                  key={face.id || face.tracking_id}
                  className={`p-3 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-2.5 ${
                    face.in_restricted_zone
                      ? 'bg-rose-950/20 border-rose-500/40 shadow-sm'
                      : face.is_masked
                      ? 'bg-purple-950/20 border-purple-500/40 shadow-sm'
                      : face.is_running
                      ? 'bg-amber-950/20 border-amber-500/40 shadow-sm'
                      : isLiveNow
                      ? 'bg-sky-950/20 border-sky-500/50 shadow-md'
                      : 'bg-slate-900/80 border-slate-800/80 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                >
                  <div className='flex items-start gap-3'>
                    {/* Zoomed Face Snapshot Avatar */}
                    <div className='relative w-20 h-20 rounded-xl overflow-hidden bg-slate-950 border border-slate-700/80 flex-shrink-0 shadow-inner flex items-center justify-center group'>
                      {face.image_url ? (
                        <img
                          src={face.image_url}
                          alt={face.label}
                          className='w-full h-full object-cover transition-transform duration-300 group-hover:scale-110'
                        />
                      ) : (
                        <UserCheck className='w-8 h-8 text-slate-600' />
                      )}

                      {face.in_restricted_zone && (
                        <div className='absolute top-1 right-1 p-1 rounded-md bg-rose-600 text-white shadow'>
                          <ShieldAlert className='w-3 h-3' />
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className='min-w-0 flex-1 space-y-1'>
                      <div className='flex items-center justify-between gap-1'>
                        <h3 className='text-sm font-bold text-white truncate'>
                          {face.label}
                        </h3>
                      </div>

                      <div className='flex items-center gap-1.5 flex-wrap'>
                        {face.in_restricted_zone && (
                          <span className='text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-rose-500/10 text-rose-300 border-rose-500/20'>
                            ZONE BREACH
                          </span>
                        )}

                        {face.is_masked && (
                          <span className='text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-purple-500/10 text-purple-300 border-purple-500/20'>
                            🎭 MASKED
                          </span>
                        )}

                        {face.is_running && (
                          <span className='text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-300 border-amber-500/20'>
                            🏃 RUNNING
                          </span>
                        )}

                        {!face.in_restricted_zone && !face.is_running && !face.is_masked && (
                          <span className='text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-sky-500/10 text-sky-300 border-sky-500/20'>
                            ACTIVE TRACK
                          </span>
                        )}

                        {face.occurrences > 1 && (
                          <span className='text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700'>
                            {face.occurrences}x
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono pt-0.5">
                        <Clock className="w-3 h-3 text-sky-400" />
                        <span>{formatTimestamp(face.timestamp)}</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-emerald-400 font-semibold">{face.confidence}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => onSeekToTimestamp(face.timestamp)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-all shadow-sm"
                      title="Jump to this person in video"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Jump to Sighting</span>
                    </button>

                    {face.image_url && (
                      <button
                        onClick={() => handleDownloadFace(face)}
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition-all"
                        title="Download Zoomed Face Photo"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
