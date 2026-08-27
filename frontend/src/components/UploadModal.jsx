import React, { useState } from "react";
import { Upload, Film, AlertTriangle, Cpu, X, FileVideo } from "lucide-react";

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

  const cleanTitle = (title) => {
    if (!title) return "Camera Feed";
    return title.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl relative">
        {/* Close Button */}
        {!isProcessing && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Processing Overlay Screen */}
        {isProcessing ? (
          <div className="p-8 text-center space-y-6">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-zinc-800 border-t-white animate-spin" />
              <Cpu className="w-8 h-8 text-white animate-pulse" />
            </div>

            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center justify-center gap-2">
                Connecting Live Surveillance Feed
              </h2>
              <p className="text-xs text-zinc-400 font-mono mt-1">
                YOLOv8 Engine • Linking Real-Time Camera Analytics
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2 max-w-md mx-auto">
              <div className="flex justify-between text-xs font-mono text-zinc-300">
                <span>INFERENCE PIPELINE</span>
                <span className="text-white font-bold">{Math.round(processingProgress)}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-300 rounded-full"
                  style={{ width: `${Math.max(4, processingProgress)}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="p-7 space-y-6">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileVideo className="w-5 h-5 text-zinc-300" />
                Select Video Stream Source
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Upload CCTV footage or select a pre-configured channel feed for live AI tracking.
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
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
              className={`p-9 rounded-2xl border-2 border-dashed transition-all text-center ${
                dragActive
                  ? "border-white bg-zinc-800/80"
                  : "border-zinc-700 bg-zinc-950/60 hover:border-zinc-500"
              }`}
            >
              <Upload className="w-10 h-10 mx-auto text-zinc-400 mb-3" />
              <p className="text-sm font-semibold text-zinc-200">
                Drag and drop your CCTV video file here
              </p>
              <p className="text-xs text-zinc-400 mt-1">Supports MP4, WebM, MOV, or AVI format</p>
              
              <label className="inline-block mt-5 px-5 py-2.5 rounded-2xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold cursor-pointer transition-all shadow-md">
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
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
                  Or select Available Surveillance Channel
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {samples.map((sample) => (
                    <button
                      key={sample.id}
                      onClick={() => onSelectSample(sample.id)}
                      className="p-3.5 rounded-2xl bg-zinc-950/80 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-600 text-left transition-all group flex items-start gap-3"
                    >
                      <div className="p-2 rounded-xl bg-zinc-800 text-zinc-300 group-hover:bg-zinc-700 group-hover:text-white">
                        <Film className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-zinc-200 truncate group-hover:text-white">
                          {cleanTitle(sample.title)}
                        </p>
                        <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
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
