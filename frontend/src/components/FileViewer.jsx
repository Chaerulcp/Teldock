import { useEffect } from 'react';
import { X, Download, Lock, FileText, Loader2 } from 'lucide-react';
import { fileApi } from '../services/api';

function isImage(m) { return m?.startsWith('image/'); }
function isVideo(m) { return m?.startsWith('video/'); }
function isAudio(m) { return m?.startsWith('audio/'); }
function isPdf(m) { return m?.includes('pdf'); }

export function canPreview(file) {
  if (!file || file.isEncrypted) return false;
  const m = file.mimeType;
  return isImage(m) || isVideo(m) || isAudio(m) || isPdf(m);
}

function FileViewer({ file, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!file) return null;
  const src = fileApi.preview(file.id);
  const m = file.mimeType;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink-950/90 backdrop-blur-sm" onClick={onClose}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 sm:px-6 h-14 border-b border-white/10 text-white" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-medium truncate flex-1">{file.displayFilename}</p>
        <a
          href={fileApi.download(file.id)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" /> <span className="hidden sm:inline">Download</span>
        </a>
        <button onClick={onClose} className="w-9 h-9 grid place-items-center rounded-lg text-white/80 hover:bg-white/10 transition-colors" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 grid place-items-center p-4 sm:p-8" onClick={(e) => e.stopPropagation()}>
        {file.isEncrypted ? (
          <div className="text-center text-white/70">
            <Lock className="w-12 h-12 mx-auto mb-3" />
            <p className="font-medium">Encrypted files can't be previewed</p>
            <p className="text-sm text-white/50 mt-1">Download the file to open it.</p>
          </div>
        ) : isImage(m) ? (
          <img src={src} alt={file.displayFilename} className="max-w-full max-h-full object-contain rounded-lg" />
        ) : isVideo(m) ? (
          <video src={src} controls autoPlay className="max-w-full max-h-full rounded-lg" />
        ) : isAudio(m) ? (
          <div className="w-full max-w-md bg-ink-900 rounded-2xl p-6 border border-white/10">
            <p className="text-white text-sm font-medium truncate mb-4">{file.displayFilename}</p>
            <audio src={src} controls autoPlay className="w-full" />
          </div>
        ) : isPdf(m) ? (
          <embed src={src} type="application/pdf" className="w-full h-full rounded-lg bg-white" />
        ) : (
          <div className="text-center text-white/70">
            <FileText className="w-12 h-12 mx-auto mb-3" />
            <p className="font-medium">Preview not available</p>
            <p className="text-sm text-white/50 mt-1">Download the file to open it.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default FileViewer;
