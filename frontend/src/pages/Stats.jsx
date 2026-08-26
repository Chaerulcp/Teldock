import { useState, useEffect } from 'react';
import { BarChart3, HardDrive, Files, Folder, Lock, Layers, Copy, Trash2, Loader2, Image as ImageIcon, Video, Music, FileText, FileArchive, File as FileIcon } from 'lucide-react';
import { statsApi, fileApi } from '../services/api';
import { toast } from 'react-toastify';

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const CATEGORY_META = {
  image: { label: 'Images', color: 'bg-emerald-500', Icon: ImageIcon },
  video: { label: 'Videos', color: 'bg-purple-500', Icon: Video },
  audio: { label: 'Audio', color: 'bg-amber-500', Icon: Music },
  document: { label: 'Documents', color: 'bg-blue-500', Icon: FileText },
  archive: { label: 'Archives', color: 'bg-orange-500', Icon: FileArchive },
  other: { label: 'Other', color: 'bg-ink-400', Icon: FileIcon },
};

function Stats() {
  const [storage, setStorage] = useState(null);
  const [dups, setDups] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [s, d] = await Promise.all([statsApi.storage(), statsApi.duplicates()]);
      setStorage(s.data.data);
      setDups(d.data.data);
    } catch {
      toast.error('Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const deleteFile = async (id) => {
    if (!confirm('Delete this duplicate file?')) return;
    try {
      await fileApi.delete(id);
      toast.success('File deleted');
      load();
    } catch {
      toast.error('Failed to delete file');
    }
  };

  const total = storage?.totalBytes || 0;
  const categories = storage ? Object.entries(storage.byCategory).sort((a, b) => b[1].bytes - a[1].bytes) : [];

  return (
    <div className="min-h-[100dvh]">
      <header className="sticky top-0 z-20 bg-ink-50/80 dark:bg-ink-950/80 backdrop-blur-md border-b border-ink-200/70 dark:border-ink-800/70">
        <div className="px-6 h-16 flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-primary-500" />
          <h1 className="font-display font-bold text-lg text-ink-900 dark:text-white">Storage Stats</h1>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {loading ? (
          <div className="grid place-items-center py-24"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Storage used', value: formatFileSize(total), Icon: HardDrive },
                { label: 'Files', value: storage.fileCount, Icon: Files },
                { label: 'Folders', value: storage.folderCount, Icon: Folder },
                { label: 'Encrypted', value: storage.encryptedCount, Icon: Lock },
              ].map((c) => (
                <div key={c.label} className="rounded-2xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 p-5">
                  <div className="flex items-center gap-2 text-ink-400">
                    <c.Icon className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">{c.label}</span>
                  </div>
                  <p className="mt-2 font-display font-bold text-2xl text-ink-900 dark:text-white">{c.value}</p>
                </div>
              ))}
            </div>

            {/* Breakdown by type */}
            <div className="rounded-2xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 p-6">
              <h2 className="font-display font-semibold text-ink-900 dark:text-white">By file type</h2>
              {categories.length === 0 ? (
                <p className="mt-4 text-sm text-ink-500">No files yet.</p>
              ) : (
                <>
                  <div className="mt-4 h-3 w-full rounded-full overflow-hidden flex bg-ink-100 dark:bg-ink-800">
                    {categories.map(([cat, data]) => {
                      const meta = CATEGORY_META[cat] || CATEGORY_META.other;
                      const pct = total > 0 ? (data.bytes / total) * 100 : 0;
                      return <div key={cat} className={meta.color} style={{ width: `${pct}%` }} title={`${meta.label}: ${formatFileSize(data.bytes)}`} />;
                    })}
                  </div>
                  <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {categories.map(([cat, data]) => {
                      const meta = CATEGORY_META[cat] || CATEGORY_META.other;
                      return (
                        <div key={cat} className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-lg grid place-items-center text-white ${meta.color}`}><meta.Icon className="w-4 h-4" /></span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-ink-900 dark:text-white">{meta.label}</p>
                            <p className="text-xs text-ink-400 font-mono">{data.count} · {formatFileSize(data.bytes)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Duplicates */}
            <div className="rounded-2xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-semibold text-ink-900 dark:text-white">Duplicate files</h2>
                {dups && dups.wastedBytes > 0 && (
                  <span className="text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded">
                    ~{formatFileSize(dups.wastedBytes)} wasted
                  </span>
                )}
              </div>
              {!dups || dups.groups.length === 0 ? (
                <p className="mt-4 text-sm text-ink-500">No duplicate files found.</p>
              ) : (
                <div className="mt-4 space-y-4">
                  {dups.groups.map((group) => (
                    <div key={group.checksum} className="rounded-xl border border-ink-100 dark:border-ink-800 p-3">
                      <div className="flex items-center gap-2 text-xs text-ink-400 mb-2">
                        <Layers className="w-3.5 h-3.5" />
                        <span>{group.count} copies · {formatFileSize(group.size)} each</span>
                        <span className="font-mono truncate">#{group.checksum.slice(0, 12)}</span>
                      </div>
                      <div className="divide-y divide-ink-100 dark:divide-ink-800">
                        {group.files.map((f, idx) => (
                          <div key={f.id} className="flex items-center gap-3 py-2">
                            <span className="text-sm text-ink-900 dark:text-white truncate flex-1">{f.displayFilename}</span>
                            {idx === 0 ? (
                              <span className="text-[10px] font-semibold text-primary-600 bg-primary-50 dark:bg-primary-950/40 px-1.5 py-0.5 rounded">Original</span>
                            ) : (
                              <button onClick={() => deleteFile(f.id)} className="w-7 h-7 grid place-items-center rounded-lg text-ink-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 transition-colors" title="Delete duplicate">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Stats;
