import React, { useState, useMemo } from 'react';
import { 
  UserCheck, 
  Search, 
  Trash2, 
  Download, 
  Clock, 
  Eye, 
  ShieldAlert, 
  Camera,
  User,
  Zap
} from 'lucide-react';

export default function FaceGallery({ faces = [], currentTime, onSeekToTimestamp, onClearFaces }) {
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const cleanLabel = (lbl) => {
    if (!lbl) return 'Subject';
    return lbl.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
  };

  // Strictly de-duplicate faces by tracking_id so each person has 1 master card
  const uniqueFaces = useMemo(() => {
    const map = new Map();
    (faces || []).forEach((face) => {
      const id = face.tracking_id || face.id;
      if (!map.has(id)) {
        map.set(id, { ...face, label: cleanLabel(face.label), occurrences: face.occurrences || 1 });
      } else {
        const existing = map.get(id);
        existing.occurrences = Math.max(existing.occurrences, face.occurrences || 1);
        if (face.timestamp > existing.timestamp) existing.timestamp = face.timestamp;
        if (face.in_restricted_zone) existing.in_restricted_zone = true;
        if (face.is_running) existing.is_running = true;
        if (face.is_masked) existing.is_masked = true;
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
    <div className='flex flex-col h-[580px] bg-zinc-900/90 rounded-3xl border border-zinc-800 backdrop-blur-2xl shadow-2xl overflow-hidden'>
      {/* Top Header */}
      <div className='p-4 px-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60'>
        <div className='flex items-center gap-3.5'>
          <div className='w-10 h-10 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center'>
            <User className='w-5 h-5 text-zinc-300' />
          </div>
          <div>
            <h2 className='text-xs font-bold text-white uppercase tracking-wider'>
              Facial Snapshots Gallery
            </h2>
            <p className='text-[11px] text-zinc-400 font-normal'>
              {uniqueFaces.length} Unique Subjects Tracked
            </p>
          </div>
        </div>

        <div className='flex items-center gap-2'>
          {uniqueFaces.length > 0 && onClearFaces && (
            <button
              onClick={onClearFaces}
              className='flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-300 border border-zinc-700 text-xs font-semibold transition-all shadow-sm'
              title='Clear captured face gallery'
            >
              <Trash2 className='w-3.5 h-3.5' />
              <span>Clear</span>
            </button>
          )}

          <span className='text-[11px] font-semibold text-zinc-300 px-3.5 py-1.5 rounded-full bg-zinc-800 border border-zinc-700'>
            {uniqueFaces.length} Faces
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className='px-6 py-3 border-b border-zinc-800/80 flex items-center justify-between gap-3 bg-zinc-900/40'>
        <div className='flex items-center gap-1.5 overflow-x-auto no-scrollbar'>
          {['ALL', 'BREACHES', 'MASKED', 'NORMAL'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                filterType === type
                  ? 'bg-zinc-800 text-white border border-zinc-600 shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className='relative flex items-center'>
          <Search className='w-3.5 h-3.5 text-zinc-500 absolute left-3 pointer-events-none' />
          <input
            type='text'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder='Search subject...'
            className='text-xs px-3 pl-8 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-all w-44'
          />
        </div>
      </div>

      {/* Faces Gallery Grid */}
      <div className='flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar'>
        {filteredFaces.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-full text-center py-16 text-zinc-400 space-y-2'>
            <Camera className='w-9 h-9 text-zinc-700 stroke-[1.5]' />
            <p className='text-sm font-medium text-zinc-300'>No human faces captured yet.</p>
            <p className='text-xs text-zinc-500'>Zoomed facial captures will appear automatically as subjects enter the scene.</p>
          </div>
        ) : (
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3.5'>
            {filteredFaces.map((face) => {
              const isLiveNow = Math.abs(currentTime - face.timestamp) < 1.5;

              return (
                <div
                  key={face.id || face.tracking_id}
                  className={`p-3.5 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-3 ${
                    face.in_restricted_zone
                      ? 'bg-rose-950/20 border-rose-500/40 shadow-sm'
                      : face.is_masked
                      ? 'bg-purple-950/20 border-purple-500/40 shadow-sm'
                      : face.is_running
                      ? 'bg-amber-950/20 border-amber-500/40 shadow-sm'
                      : isLiveNow
                      ? 'bg-zinc-800 border-zinc-600 shadow-md'
                      : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850/80'
                  }`}
                >
                  <div className='flex items-start gap-3.5'>
                    {/* Zoomed Face Snapshot Avatar */}
                    <div className='relative w-20 h-20 rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 flex-shrink-0 shadow-inner flex items-center justify-center group'>
                      {face.image_url ? (
                        <img
                          src={face.image_url}
                          alt={face.label}
                          className='w-full h-full object-cover transition-transform duration-300 group-hover:scale-110'
                        />
                      ) : (
                        <User className='w-8 h-8 text-zinc-700' />
                      )}

                      {face.in_restricted_zone && (
                        <div className='absolute top-1 right-1 p-1 rounded-lg bg-rose-600 text-white shadow'>
                          <ShieldAlert className='w-3 h-3' />
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className='min-w-0 flex-1 space-y-1.5'>
                      <div className='flex items-center justify-between gap-1'>
                        <h3 className='text-xs font-bold text-white truncate'>
                          {cleanLabel(face.label)}
                        </h3>
                      </div>

                      <div className='flex items-center gap-1.5 flex-wrap'>
                        {face.in_restricted_zone && (
                          <span className='text-[10px] font-semibold px-2.5 py-0.5 rounded-full border bg-rose-950/50 text-rose-300 border-rose-800/60'>
                            ZONE BREACH
                          </span>
                        )}

                        {face.is_masked && (
                          <span className='text-[10px] font-semibold px-2.5 py-0.5 rounded-full border bg-purple-950/50 text-purple-300 border-purple-800/60'>
                            MASKED
                          </span>
                        )}

                        {face.is_running && (
                          <span className='text-[10px] font-semibold px-2.5 py-0.5 rounded-full border bg-amber-950/50 text-amber-300 border-amber-800/60'>
                            RUNNING
                          </span>
                        )}

                        {!face.in_restricted_zone && !face.is_running && !face.is_masked && (
                          <span className='text-[10px] font-semibold px-2.5 py-0.5 rounded-full border bg-zinc-800 text-zinc-300 border-zinc-700'>
                            ACTIVE TRACK
                          </span>
                        )}

                        {face.occurrences > 1 && (
                          <span className='text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700'>
                            {face.occurrences}x
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono pt-0.5">
                        <Clock className="w-3 h-3 text-zinc-400" />
                        <span>{formatTimestamp(face.timestamp)}</span>
                        <span className="text-zinc-600">•</span>
                        <span className="text-emerald-400 font-semibold">{face.confidence}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-zinc-800/80">
                    <button
                      onClick={() => onSeekToTimestamp(face.timestamp)}
                      className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-semibold transition-all border border-zinc-700 shadow-sm"
                      title="Jump to this person in video"
                    >
                      <Eye className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Jump to Sighting</span>
                    </button>

                    {face.image_url && (
                      <button
                        onClick={() => handleDownloadFace(face)}
                        className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition-all"
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
