import { useEffect, useState } from "react";
import { X, Download, Lock, FileText, Loader2 } from "lucide-react";
import { fileApi } from "../services/api";

function isImage(m) {
  return m?.startsWith("image/");
}
function isVideo(m) {
  return m?.startsWith("video/");
}
function isAudio(m) {
  return m?.startsWith("audio/");
}
function isPdf(m) {
  return m?.includes("pdf");
}

export function canPreview(file) {
  if (!file || file.isEncrypted) return false;
  const m = file.mimeType;
  return isImage(m) || isVideo(m) || isAudio(m) || isPdf(m);
}

function FileViewer({ file, onClose }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [accessError, setAccessError] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setPreviewUrl(null);
    setDownloadUrl(null);
    setAccessError(false);

    if (!file) {
      return () => {
        cancelled = true;
      };
    }

    Promise.all([
      file.isEncrypted ? Promise.resolve(null) : fileApi.preview(file.id),
      fileApi.download(file.id),
    ])
      .then(([nextPreviewUrl, nextDownloadUrl]) => {
        if (cancelled) return;
        setPreviewUrl(nextPreviewUrl);
        setDownloadUrl(nextDownloadUrl);
      })
      .catch(() => {
        if (!cancelled) setAccessError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [file]);

  if (!file) return null;
  const m = file.mimeType;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-ink-950/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 sm:px-6 h-14 border-b border-white/10 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-medium truncate flex-1">
          {file.displayFilename}
        </p>
        <button
          type="button"
          onClick={() => window.open(downloadUrl, "_blank", "noopener")}
          disabled={!downloadUrl}
          className="inline-flex items-center gap-1.5 text-sm font-medium bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="w-4 h-4" />{" "}
          <span className="hidden sm:inline">Download</span>
        </button>
        <button
          onClick={onClose}
          className="w-9 h-9 grid place-items-center rounded-lg text-white/80 hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div
        className="flex-1 min-h-0 grid place-items-center p-4 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {file.isEncrypted ? (
          <div className="text-center text-white/70">
            <Lock className="w-12 h-12 mx-auto mb-3" />
            <p className="font-medium">Encrypted files can't be previewed</p>
            <p className="text-sm text-white/50 mt-1">
              Download the file to open it.
            </p>
          </div>
        ) : accessError ? (
          <div className="text-center text-white/70">
            <FileText className="w-12 h-12 mx-auto mb-3" />
            <p className="font-medium">Unable to prepare the file preview</p>
          </div>
        ) : !previewUrl ? (
          <div className="text-center text-white/70" role="status">
            <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" />
            <p className="text-sm">Preparing secure preview…</p>
          </div>
        ) : isImage(m) ? (
          <img
            src={previewUrl}
            alt={file.displayFilename}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        ) : isVideo(m) ? (
          <video
            src={previewUrl}
            controls
            autoPlay
            className="max-w-full max-h-full rounded-lg"
          />
        ) : isAudio(m) ? (
          <div className="w-full max-w-md bg-ink-900 rounded-2xl p-6 border border-white/10">
            <p className="text-white text-sm font-medium truncate mb-4">
              {file.displayFilename}
            </p>
            <audio src={previewUrl} controls autoPlay className="w-full" />
          </div>
        ) : isPdf(m) ? (
          <embed
            src={previewUrl}
            type="application/pdf"
            className="w-full h-full rounded-lg bg-white"
          />
        ) : (
          <div className="text-center text-white/70">
            <FileText className="w-12 h-12 mx-auto mb-3" />
            <p className="font-medium">Preview not available</p>
            <p className="text-sm text-white/50 mt-1">
              Download the file to open it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default FileViewer;
