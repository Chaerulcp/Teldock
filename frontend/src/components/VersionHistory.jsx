import { useState, useEffect } from 'react';
import { Clock, History, X, RotateCcw, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { fileApi } from '../services/api';

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Modal showing a file's version history with restore capability.
 */
function VersionHistory({ file, onClose, onChanged }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [reverting, setReverting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fileApi.versions(file.id);
      setVersions(res.data.data.versions || []);
    } catch {
      toast.error('Failed to load version history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    load();
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.id]);

  const doRevert = async () => {
    setReverting(true);
    try {
      await fileApi.revert(file.id, confirm.id);
      toast.success(`Restored to v${confirm.versionNumber}`);
      setConfirm(null);
      await load();
      if (onChanged) onChanged();
    } catch {
      toast.error('Failed to restore version');
    } finally {
      setReverting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-5 h-14 border-b border-ink-100 dark:border-ink-800">
          <History className="w-5 h-5 text-primary-500" />
          <div className="min-w-0 flex-1">
            <p className="font-display font-semibold text-ink-900 dark:text-white leading-none">Version history</p>
            <p className="text-xs text-ink-400 mt-0.5 truncate">{file.displayFilename}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="grid place-items-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>
          ) : versions.length === 0 ? (
            <div className="text-center py-10">
              <Clock className="w-10 h-10 mx-auto text-ink-300" />
              <p className="mt-3 text-sm font-medium text-ink-900 dark:text-white">No previous versions</p>
              <p className="mt-1 text-xs text-ink-500">Re-upload a file with the same name to create a version.</p>
            </div>
          ) : (
            <ul className="divide-y divide-ink-100 dark:divide-ink-800 max-h-80 overflow-y-auto">
              {versions.map((v) => (
                <li key={v.id} className="flex items-center gap-3 py-3">
                  <span className="w-9 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 grid place-items-center text-xs font-mono font-semibold text-ink-600 dark:text-ink-300">v{v.versionNumber}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink-900 dark:text-white truncate">{v.filename}</p>
                    <p className="text-xs text-ink-400 font-mono">{formatFileSize(v.fileSize)} · {new Date(v.createdAt).toLocaleString()}</p>
                  </div>
                  <button onClick={() => setConfirm(v)} className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40 px-2.5 py-1.5 rounded-lg transition-colors">
                    <RotateCcw className="w-3.5 h-3.5" /> Restore
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Confirm restore */}
      {confirm && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-ink-950/60 p-4" onClick={() => setConfirm(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 shadow-card p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 text-amber-500">
              <AlertCircle className="w-5 h-5" />
              <h3 className="font-display font-semibold text-ink-900 dark:text-white">Restore v{confirm.versionNumber}?</h3>
            </div>
            <p className="mt-3 text-sm text-ink-600 dark:text-ink-300">
              The current file will be saved as a new version before restoring.
            </p>
            <div className="mt-5 flex gap-3">
              <button onClick={doRevert} disabled={reverting} className="flex-1 inline-flex items-center justify-center gap-2 bg-primary-600 text-white py-2.5 rounded-xl font-medium hover:bg-primary-500 disabled:opacity-60 transition-colors">
                {reverting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />} Restore
              </button>
              <button onClick={() => setConfirm(null)} className="flex-1 py-2.5 rounded-xl font-medium text-ink-600 dark:text-ink-300 border border-ink-200 dark:border-ink-800 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VersionHistory;
