import React, { useState, useEffect } from "react";
import { Upload, Film, AlertTriangle, CheckCircle, Cpu, X, FileVideo } from "lucide-react";

export default function UploadModal({
  isOpen,
  onClose,
  samples,
  onSelectSample,
  onUploadFile,
  isProcessing,
  processingProgress,
  processingFrame,
  totalFrames,
  eventsCount,
  detectionsCount,
  error
}) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  if (!isOpen) return null;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      onUploadFile(file);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      onUploadFile(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-2xl overflow-hidden border-cyan-800/60 shadow-2xl relative">
        {/* Close Button */}
        {!isProcessing && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Processing Overlay Screen */}
        {isProcessing ? (
          <div className="p-8 text-center space-y-6">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
              <Cpu className="w-8 h-8 text-cyan-400 animate-pulse" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-100 uppercase tracking-wider flex items-center justify-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block"></span>
                Connecting Live AI CCTV Stream
              </h2>
              <p className="text-xs text-cyan-400 font-mono mt-1">
                YOLOv8 ByteTrack Engine • Establishing Real-Time Analytics ({processingFrame > 0 ? `Frame ${processingFrame} / ${totalFrames}` : "Instant Stream Link"})
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2 max-w-md mx-auto">
              <div className="flex justify-between text-xs font-mono text-slate-300">
                <span>AI OBJECT EXTRACTION</span>
                <span className="text-cyan-400 font-bold">{Math.round(processingProgress)}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 transition-all duration-300 rounded-full"
                  style={{ width: `${Math.max(4, processingProgress)}%` }}
                />
              </div>
            </div>

            {/* Live Stats Pill */}
            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto pt-2">
              <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-center">
                <p className="text-[10px] font-mono text-slate-400">OBJECTS DETECTED</p>
                <p className="text-lg font-bold font-mono text-cyan-400">{detectionsCount}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-center">
                <p className="text-[10px] font-mono text-slate-400">EVENTS LOGGED</p>
                <p className="text-lg font-bold font-mono text-amber-400">{eventsCount}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <FileVideo className="w-5 h-5 text-cyan-400" />
                Select Surveillance Video Source
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload CCTV footage or select pre-loaded reference video stream for instant AI analysis.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Drag & Drop Area */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`p-8 rounded-xl border-2 border-dashed transition-all text-center ${
                dragActive
                  ? "border-cyan-400 bg-cyan-950/30"
                  : "border-slate-700 bg-slate-900/50 hover:border-slate-600"
              }`}
            >
              <Upload className="w-10 h-10 mx-auto text-cyan-400/80 mb-3" />
              <p className="text-sm font-medium text-slate-200">
                Drag & drop your CCTV video file here
              </p>
              <p className="text-xs text-slate-400 mt-1">Supports MP4, WebM, MOV, or AVI format</p>
              
              <label className="inline-block mt-4 px-4 py-2 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 text-xs font-semibold cursor-pointer transition-all">
                Browse Files
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Reference Sample Videos List */}
            {samples && samples.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Or select Reference Sample CCTV Footage
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {samples.map((sample) => (
                    <button
                      key={sample.id}
                      onClick={() => onSelectSample(sample.id)}
                      className="p-3 rounded-lg bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/50 text-left transition-all group flex items-start gap-3"
                    >
                      <div className="p-2 rounded bg-slate-800 text-cyan-400 group-hover:bg-cyan-950 group-hover:text-cyan-300">
                        <Film className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-cyan-300">
                          {sample.title}
                        </p>
                        <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                          {sample.category} • {sample.size_mb} MB
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
