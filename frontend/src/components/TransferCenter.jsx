import { useTransfers } from '../store/transfer-context';
import { X, ChevronDown, CheckCircle2, AlertCircle, Loader2, UploadCloud } from 'lucide-react';
import { useState } from 'react';

function TransferCenter() {
  const { transfers, open, setOpen, clearCompleted } = useTransfers();
  const [minimized, setMinimized] = useState(false);

  if (!open || transfers.length === 0) return null;

  const active = transfers.filter((t) => t.status === 'uploading' || t.status === 'queued').length;

  return (
    <div className="fixed bottom-4 right-4 z-40 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 shadow-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 h-11 border-b border-ink-100 dark:border-ink-800">
        <UploadCloud className="w-4 h-4 text-primary-500" />
        <span className="text-sm font-semibold text-ink-900 dark:text-white flex-1">
          {active > 0 ? `Uploading ${active} file${active !== 1 ? 's' : ''}…` : 'Transfers'}
        </span>
        <button onClick={() => setMinimized((m) => !m)} className="w-7 h-7 grid place-items-center rounded-lg text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors">
          <ChevronDown className={`w-4 h-4 transition-transform ${minimized ? 'rotate-180' : ''}`} />
        </button>
        <button onClick={() => { clearCompleted(); setOpen(false); }} className="w-7 h-7 grid place-items-center rounded-lg text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {!minimized && (
        <div className="max-h-72 overflow-y-auto divide-y divide-ink-100 dark:divide-ink-800">
          {transfers.map((t) => (
            <div key={t.id} className="px-4 py-3">
              <div className="flex items-center gap-2">
                {t.status === 'done' ? (
                  <CheckCircle2 className="w-4 h-4 text-primary-500 flex-shrink-0" />
                ) : t.status === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                ) : (
                  <Loader2 className="w-4 h-4 text-ink-400 animate-spin flex-shrink-0" />
                )}
                <span className="text-sm text-ink-900 dark:text-white truncate flex-1">{t.name}</span>
                <span className="text-xs font-mono text-ink-400">
                  {t.status === 'done' ? '100%' : t.status === 'error' ? 'failed' : `${t.progress}%`}
                </span>
              </div>
              {t.status !== 'error' && (
                <div className="mt-2 h-1.5 w-full rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${t.status === 'done' ? 'bg-primary-500' : 'bg-primary-400'}`} style={{ width: `${t.progress}%` }} />
                </div>
              )}
              {t.status === 'error' && <p className="mt-1 text-xs text-red-500">{t.error}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TransferCenter;
