import { useState, useEffect } from 'react';
import { Share2, Copy, Trash2, Lock, Clock, Download, Loader2, Link2 } from 'lucide-react';
import { shareApi } from '../services/api';
import { toast } from 'react-toastify';

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function Shares() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await shareApi.list({ limit: 100 });
      setLinks(res.data.data.links || []);
    } catch {
      toast.error('Failed to load shared links');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const copy = (url) => {
    navigator.clipboard.writeText(url);
    toast.success('Link copied');
  };

  const revoke = async (id) => {
    if (!confirm('Revoke this link? It will stop working immediately.')) return;
    try {
      await shareApi.revoke(id);
      toast.success('Link revoked');
      load();
    } catch {
      toast.error('Failed to revoke link');
    }
  };

  return (
    <div className="min-h-[100dvh]">
      <header className="sticky top-0 z-20 bg-ink-50/80 dark:bg-ink-950/80 backdrop-blur-md border-b border-ink-200/70 dark:border-ink-800/70">
        <div className="px-6 h-16 flex items-center gap-3">
          <Share2 className="w-5 h-5 text-primary-500" />
          <div>
            <h1 className="font-display font-bold text-lg text-ink-900 dark:text-white leading-none">Shared Links</h1>
            <p className="text-xs text-ink-400 mt-0.5">{links.length} active link{links.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </header>

      <div className="p-6">
        {loading ? (
          <div className="grid place-items-center py-24"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>
        ) : links.length === 0 ? (
          <div className="rounded-2xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 py-20 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-ink-100 dark:bg-ink-800 grid place-items-center">
              <Link2 className="w-8 h-8 text-ink-400" />
            </div>
            <p className="mt-4 font-display font-semibold text-ink-900 dark:text-white">No shared links yet</p>
            <p className="mt-1 text-sm text-ink-500">Share a file from your dashboard to create one.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 overflow-hidden divide-y divide-ink-100 dark:divide-ink-800">
            {links.map((link) => (
              <div key={link.id} className="flex items-center gap-4 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-ink-900 dark:text-white truncate">
                      {link.file?.displayFilename || link.file?.originalFilename || 'Unknown file'}
                    </p>
                    {link.hasPassword && <Lock className="w-3.5 h-3.5 text-ink-400 flex-shrink-0" title="Password protected" />}
                    {!link.isUsable && (
                      <span className="text-[10px] font-semibold text-red-600 bg-red-50 dark:bg-red-950/30 px-1.5 py-0.5 rounded flex-shrink-0">
                        {link.isExpired ? 'Expired' : 'Limit reached'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-ink-400 font-mono">
                    {link.file?.fileSize != null && <span>{formatFileSize(link.file.fileSize)}</span>}
                    <span className="inline-flex items-center gap-1"><Download className="w-3 h-3" />{link.usedDownloads}{link.downloadLimit ? `/${link.downloadLimit}` : ''}</span>
                    {link.expiresAt && <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(link.expiresAt).toLocaleDateString()}</span>}
                  </div>
                </div>
                <button onClick={() => copy(link.shortUrl)} className="w-8 h-8 grid place-items-center rounded-lg text-ink-500 hover:bg-primary-50 dark:hover:bg-primary-950/40 hover:text-primary-600 transition-colors" title="Copy link">
                  <Copy className="w-4 h-4" />
                </button>
                <button onClick={() => revoke(link.id)} className="w-8 h-8 grid place-items-center rounded-lg text-ink-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 transition-colors" title="Revoke">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Shares;
