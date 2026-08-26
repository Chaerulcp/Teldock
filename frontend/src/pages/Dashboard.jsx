import { useState, useEffect, useMemo } from 'react';
import {
  UploadCloud, FileText, Image as ImageIcon, Video, Music, Download, Share2,
  Trash2, Folder, Lock, Search, LayoutGrid, List, FileArchive, File as FileIcon
} from 'lucide-react';
import { fileApi } from '../services/api';
import { toast } from 'react-toastify';

function Dashboard() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [encryptUploads, setEncryptUploads] = useState(false);
  const [view, setView] = useState('grid');
  const [query, setQuery] = useState('');

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const response = await fileApi.list({ limit: 100 });
      setFiles(response.data.data.files || []);
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('file', file);
    if (encryptUploads) formData.append('encrypt', 'true');

    try {
      await fileApi.upload(formData, (evt) => {
        if (evt.total) setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
      });
      toast.success(`"${file.name}" uploaded`);
      loadFiles();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this file?')) return;
    try {
      await fileApi.delete(id);
      toast.success('File deleted');
      loadFiles();
    } catch {
      toast.error('Failed to delete file');
    }
  };

  const handleShare = async (id) => {
    try {
      const response = await fileApi.share(id, { expiresIn: 86400, downloadLimit: 5 });
      navigator.clipboard.writeText(response.data.data.link.shortUrl);
      toast.success('Share link copied to clipboard');
    } catch {
      toast.error('Failed to create share link');
    }
  };

  const getFileMeta = (mimeType) => {
    if (mimeType?.startsWith('image/')) return { Icon: ImageIcon, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30' };
    if (mimeType?.startsWith('video/')) return { Icon: Video, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/30' };
    if (mimeType?.startsWith('audio/')) return { Icon: Music, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30' };
    if (mimeType?.includes('zip') || mimeType?.includes('rar') || mimeType?.includes('7z') || mimeType?.includes('gzip')) return { Icon: FileArchive, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/30' };
    if (mimeType?.includes('pdf')) return { Icon: FileText, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/30' };
    return { Icon: FileIcon, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' };
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleUpload(e.dataTransfer.files[0]);
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) handleUpload(e.target.files[0]);
  };

  const filtered = useMemo(() => {
    if (!query.trim()) return files;
    const q = query.toLowerCase();
    return files.filter((f) => f.displayFilename?.toLowerCase().includes(q));
  }, [files, query]);

  return (
    <div className="min-h-[100dvh]">
      {/* Topbar */}
      <header className="sticky top-0 z-20 bg-ink-50/80 dark:bg-ink-950/80 backdrop-blur-md border-b border-ink-200/70 dark:border-ink-800/70">
        <div className="px-6 h-16 flex items-center gap-4">
          <div>
            <h1 className="font-display font-bold text-lg text-ink-900 dark:text-white leading-none">My Files</h1>
            <p className="text-xs text-ink-400 mt-0.5">{files.length} items</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search files…"
                className="w-56 pl-9 pr-3 py-2 rounded-lg text-sm bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 text-ink-900 dark:text-white placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              />
            </div>
            <div className="flex items-center rounded-lg border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 p-0.5">
              <button
                onClick={() => setView('grid')}
                className={`w-8 h-8 grid place-items-center rounded-md transition-colors ${view === 'grid' ? 'bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400' : 'text-ink-400 hover:text-ink-600'}`}
                aria-label="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView('list')}
                className={`w-8 h-8 grid place-items-center rounded-md transition-colors ${view === 'list' ? 'bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400' : 'text-ink-400 hover:text-ink-600'}`}
                aria-label="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Upload zone */}
        <div
          className={`relative rounded-2xl border-2 border-dashed p-8 transition-all ${
            dragActive
              ? 'border-primary-500 bg-primary-50/60 dark:bg-primary-950/20'
              : 'border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input type="file" id="file-upload" className="hidden" onChange={handleChange} />
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-primary-50 dark:bg-primary-950/40 border border-primary-100 dark:border-primary-900/60 grid place-items-center text-primary-600 dark:text-primary-400 flex-shrink-0">
              <UploadCloud className="w-7 h-7" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p className="font-display font-semibold text-ink-900 dark:text-white">
                Drop files here or{' '}
                <label htmlFor="file-upload" className="text-primary-600 dark:text-primary-400 cursor-pointer hover:underline">browse</label>
              </p>
              <p className="text-sm text-ink-500 dark:text-ink-400 mt-0.5">Any size — large files are split automatically.</p>
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-ink-600 dark:text-ink-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={encryptUploads}
                onChange={(e) => setEncryptUploads(e.target.checked)}
                className="rounded border-ink-300 text-primary-600 focus:ring-primary-500"
              />
              <Lock className="w-4 h-4" /> Encrypt
            </label>
          </div>

          {uploading && (
            <div className="mt-5">
              <div className="w-full bg-ink-100 dark:bg-ink-800 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
              <p className="text-xs text-ink-500 mt-1.5 font-mono">Uploading… {uploadProgress}%</p>
            </div>
          )}
        </div>

        {/* Files */}
        {loading ? (
          view === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 p-4 animate-pulse">
                  <div className="w-12 h-12 rounded-xl bg-ink-100 dark:bg-ink-800" />
                  <div className="mt-4 h-3 bg-ink-100 dark:bg-ink-800 rounded w-3/4" />
                  <div className="mt-2 h-2.5 bg-ink-100 dark:bg-ink-800 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 animate-pulse" />
              ))}
            </div>
          )
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 py-20 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-ink-100 dark:bg-ink-800 grid place-items-center">
              <Folder className="w-8 h-8 text-ink-400" />
            </div>
            <p className="mt-4 font-display font-semibold text-ink-900 dark:text-white">
              {query ? 'No matching files' : 'No files yet'}
            </p>
            <p className="mt-1 text-sm text-ink-500">
              {query ? 'Try a different search.' : 'Upload your first file to get started.'}
            </p>
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((file) => {
              const { Icon, color, bg } = getFileMeta(file.mimeType);
              return (
                <div
                  key={file.id}
                  className="group rounded-2xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 p-4 hover:shadow-card hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className={`w-12 h-12 rounded-xl grid place-items-center ${bg}`}>
                      <Icon className={`w-6 h-6 ${color}`} />
                    </div>
                    <div className="flex items-center gap-1">
                      {file.isEncrypted && <Lock className="w-3.5 h-3.5 text-ink-400" />}
                      {file.isChunked && (
                        <span className="text-[10px] font-mono font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 px-1.5 py-0.5 rounded">{file.partCount}×</span>
                      )}
                    </div>
                  </div>
                  <p className="mt-4 text-sm font-medium text-ink-900 dark:text-white truncate" title={file.displayFilename}>
                    {file.displayFilename}
                  </p>
                  <p className="text-xs text-ink-400 font-mono mt-0.5">{formatFileSize(file.fileSize)}</p>
                  <div className="mt-3 pt-3 border-t border-ink-100 dark:border-ink-800 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => window.open(fileApi.download(file.id), '_blank')} className="flex-1 grid place-items-center py-1.5 rounded-lg text-ink-500 hover:bg-primary-50 dark:hover:bg-primary-950/40 hover:text-primary-600 transition-colors" title="Download">
                      <Download className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleShare(file.id)} className="flex-1 grid place-items-center py-1.5 rounded-lg text-ink-500 hover:bg-primary-50 dark:hover:bg-primary-950/40 hover:text-primary-600 transition-colors" title="Share">
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(file.id)} className="flex-1 grid place-items-center py-1.5 rounded-lg text-ink-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 transition-colors" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 overflow-hidden divide-y divide-ink-100 dark:divide-ink-800">
            {filtered.map((file) => {
              const { Icon, color, bg } = getFileMeta(file.mimeType);
              return (
                <div key={file.id} className="group flex items-center gap-4 px-4 py-3 hover:bg-ink-50 dark:hover:bg-ink-950/40 transition-colors">
                  <div className={`w-10 h-10 rounded-lg grid place-items-center flex-shrink-0 ${bg}`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-ink-900 dark:text-white truncate">{file.displayFilename}</p>
                      {file.isEncrypted && <Lock className="w-3.5 h-3.5 text-ink-400 flex-shrink-0" />}
                      {file.isChunked && (
                        <span className="text-[10px] font-mono font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 px-1.5 py-0.5 rounded flex-shrink-0">{file.partCount}×</span>
                      )}
                    </div>
                    <p className="text-xs text-ink-400 font-mono">{formatFileSize(file.fileSize)} · {new Date(file.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => window.open(fileApi.download(file.id), '_blank')} className="w-8 h-8 grid place-items-center rounded-lg text-ink-500 hover:bg-primary-50 dark:hover:bg-primary-950/40 hover:text-primary-600 transition-colors" title="Download">
                      <Download className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleShare(file.id)} className="w-8 h-8 grid place-items-center rounded-lg text-ink-500 hover:bg-primary-50 dark:hover:bg-primary-950/40 hover:text-primary-600 transition-colors" title="Share">
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(file.id)} className="w-8 h-8 grid place-items-center rounded-lg text-ink-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 transition-colors" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
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

export default Dashboard;
