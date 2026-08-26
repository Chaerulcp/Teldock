import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  UploadCloud, FileText, Image as ImageIcon, Video, Music, Download, Share2,
  Trash2, Folder, FolderPlus, Lock, Search, LayoutGrid, List, FileArchive,
  File as FileIcon, ChevronRight, Home, X, Pencil, FolderInput, CheckSquare, Square
} from 'lucide-react';
import { fileApi, folderApi } from '../services/api';
import { toast } from 'react-toastify';
import FileViewer, { canPreview } from '../components/FileViewer';

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileMeta(mimeType) {
  if (mimeType?.startsWith('image/')) return { Icon: ImageIcon, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30' };
  if (mimeType?.startsWith('video/')) return { Icon: Video, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/30' };
  if (mimeType?.startsWith('audio/')) return { Icon: Music, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30' };
  if (mimeType?.includes('zip') || mimeType?.includes('rar') || mimeType?.includes('7z') || mimeType?.includes('gzip')) return { Icon: FileArchive, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/30' };
  if (mimeType?.includes('pdf')) return { Icon: FileText, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/30' };
  return { Icon: FileIcon, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' };
}

function Dashboard() {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [encryptUploads, setEncryptUploads] = useState(false);
  const [view, setView] = useState('grid');
  const [query, setQuery] = useState('');

  // folder navigation: breadcrumb trail of {id, name}
  const [trail, setTrail] = useState([]);
  const currentFolder = trail.length ? trail[trail.length - 1] : null;

  // multi-select
  const [selected, setSelected] = useState(new Set());
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTargets, setMoveTargets] = useState([]);
  const [renaming, setRenaming] = useState(null); // file id being renamed
  const [renameValue, setRenameValue] = useState('');
  const [viewerFile, setViewerFile] = useState(null);

  const loadContent = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    try {
      const parentId = currentFolder?.id ?? null;
      const [filesRes, foldersRes] = await Promise.all([
        fileApi.list({ limit: 200, folderId: parentId || undefined }),
        folderApi.list(parentId),
      ]);
      setFiles(filesRes.data.data.files || []);
      setFolders(foldersRes.data.data.folders || []);
    } catch (error) {
      console.error('Failed to load content:', error);
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [currentFolder]);

  useEffect(() => { loadContent(); }, [loadContent]);

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('file', file);
    if (currentFolder?.id) formData.append('folderId', currentFolder.id);
    if (encryptUploads) formData.append('encrypt', 'true');
    try {
      await fileApi.upload(formData, (evt) => {
        if (evt.total) setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
      });
      toast.success(`"${file.name}" uploaded`);
      loadContent();
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
      loadContent();
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

  const submitRename = async (id) => {
    const name = renameValue.trim();
    if (!name) { setRenaming(null); return; }
    try {
      await fileApi.rename(id, name);
      toast.success('Renamed');
      setRenaming(null);
      loadContent();
    } catch {
      toast.error('Failed to rename');
    }
  };

  const createFolder = async () => {
    const name = prompt('New folder name:');
    if (!name || !name.trim()) return;
    try {
      await folderApi.create({ name: name.trim(), parentFolderId: currentFolder?.id || null });
      toast.success('Folder created');
      loadContent();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to create folder');
    }
  };

  const deleteFolder = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this folder? Files inside will move to the root.')) return;
    try {
      await folderApi.delete(id);
      toast.success('Folder deleted');
      loadContent();
    } catch {
      toast.error('Failed to delete folder');
    }
  };

  // selection helpers
  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelected(new Set());
  const selectAll = () => setSelected(new Set(filtered.map((f) => f.id)));

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} file(s)?`)) return;
    try {
      await fileApi.bulk('delete', [...selected]);
      toast.success(`Deleted ${selected.size} file(s)`);
      loadContent();
    } catch {
      toast.error('Bulk delete failed');
    }
  };

  const bulkDownload = () => {
    [...selected].forEach((id) => window.open(fileApi.download(id), '_blank'));
  };

  const openMove = async () => {
    try {
      // gather all folders (root list is enough for a flat move target here)
      const res = await folderApi.list(null);
      setMoveTargets(res.data.data.folders || []);
      setMoveOpen(true);
    } catch {
      toast.error('Failed to load folders');
    }
  };

  const doMove = async (folderId) => {
    try {
      await fileApi.bulk('move', [...selected], folderId);
      toast.success(`Moved ${selected.size} file(s)`);
      setMoveOpen(false);
      loadContent();
    } catch {
      toast.error('Move failed');
    }
  };

  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
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

  const openFolder = (folder) => setTrail((t) => [...t, { id: folder.id, name: folder.name }]);
  const goToCrumb = (idx) => setTrail((t) => (idx < 0 ? [] : t.slice(0, idx + 1)));

  const openFile = (file) => {
    if (canPreview(file)) setViewerFile(file);
    else window.open(fileApi.download(file.id), '_blank');
  };

  const selectionMode = selected.size > 0;

  return (
    <div className="min-h-[100dvh]">
      {/* Topbar */}
      <header className="sticky top-0 z-20 bg-ink-50/80 dark:bg-ink-950/80 backdrop-blur-md border-b border-ink-200/70 dark:border-ink-800/70">
        <div className="px-6 h-16 flex items-center gap-4">
          <div className="min-w-0">
            <h1 className="font-display font-bold text-lg text-ink-900 dark:text-white leading-none">My Files</h1>
            <p className="text-xs text-ink-400 mt-0.5">{folders.length} folders · {files.length} files</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search this folder…"
                className="w-52 pl-9 pr-3 py-2 rounded-lg text-sm bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 text-ink-900 dark:text-white placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              />
            </div>
            <button onClick={createFolder} className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg border border-ink-200 dark:border-ink-800 text-ink-700 dark:text-ink-200 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors">
              <FolderPlus className="w-4 h-4" /> <span className="hidden sm:inline">New folder</span>
            </button>
            <div className="flex items-center rounded-lg border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 p-0.5">
              <button onClick={() => setView('grid')} className={`w-8 h-8 grid place-items-center rounded-md transition-colors ${view === 'grid' ? 'bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400' : 'text-ink-400 hover:text-ink-600'}`} aria-label="Grid view">
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button onClick={() => setView('list')} className={`w-8 h-8 grid place-items-center rounded-md transition-colors ${view === 'list' ? 'bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400' : 'text-ink-400 hover:text-ink-600'}`} aria-label="List view">
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="px-6 pb-3 flex items-center gap-1 text-sm">
          <button onClick={() => goToCrumb(-1)} className={`inline-flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${trail.length === 0 ? 'text-ink-900 dark:text-white font-medium' : 'text-ink-500 hover:text-ink-900 dark:hover:text-white'}`}>
            <Home className="w-3.5 h-3.5" /> Home
          </button>
          {trail.map((crumb, idx) => (
            <span key={crumb.id} className="flex items-center gap-1">
              <ChevronRight className="w-3.5 h-3.5 text-ink-300" />
              <button onClick={() => goToCrumb(idx)} className={`px-2 py-1 rounded-md transition-colors ${idx === trail.length - 1 ? 'text-ink-900 dark:text-white font-medium' : 'text-ink-500 hover:text-ink-900 dark:hover:text-white'}`}>
                {crumb.name}
              </button>
            </span>
          ))}
        </div>
      </header>

      {/* Bulk toolbar */}
      {selectionMode && (
        <div className="sticky top-16 z-10 bg-primary-600 text-white px-6 py-2.5 flex items-center gap-4 shadow-md">
          <button onClick={clearSelection} className="inline-flex items-center gap-1.5 text-sm font-medium hover:opacity-80">
            <X className="w-4 h-4" /> {selected.size} selected
          </button>
          <button onClick={selectAll} className="text-sm font-medium hover:opacity-80 hidden sm:inline">Select all ({filtered.length})</button>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={bulkDownload} className="inline-flex items-center gap-1.5 text-sm font-medium bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg transition-colors">
              <Download className="w-4 h-4" /> <span className="hidden sm:inline">Download</span>
            </button>
            <button onClick={openMove} className="inline-flex items-center gap-1.5 text-sm font-medium bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg transition-colors">
              <FolderInput className="w-4 h-4" /> <span className="hidden sm:inline">Move</span>
            </button>
            <button onClick={bulkDelete} className="inline-flex items-center gap-1.5 text-sm font-medium bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">Delete</span>
            </button>
          </div>
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* Upload zone */}
        <div
          className={`relative rounded-2xl border-2 border-dashed p-6 transition-all ${dragActive ? 'border-primary-500 bg-primary-50/60 dark:bg-primary-950/20' : 'border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900'}`}
          onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
        >
          <input type="file" id="file-upload" className="hidden" onChange={handleChange} />
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-950/40 border border-primary-100 dark:border-primary-900/60 grid place-items-center text-primary-600 dark:text-primary-400 flex-shrink-0">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p className="font-display font-semibold text-ink-900 dark:text-white">
                Drop files here or <label htmlFor="file-upload" className="text-primary-600 dark:text-primary-400 cursor-pointer hover:underline">browse</label>
                {currentFolder && <span className="text-ink-400 font-normal"> → into “{currentFolder.name}”</span>}
              </p>
              <p className="text-sm text-ink-500 dark:text-ink-400 mt-0.5">Any size — large files are split automatically.</p>
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-ink-600 dark:text-ink-300 cursor-pointer select-none">
              <input type="checkbox" checked={encryptUploads} onChange={(e) => setEncryptUploads(e.target.checked)} className="rounded border-ink-300 text-primary-600 focus:ring-primary-500" />
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

        {/* Folders */}
        {!loading && folders.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-400 mb-3">Folders</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  onClick={() => openFolder(folder)}
                  className="group flex items-center gap-3 p-3 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 hover:shadow-card hover:-translate-y-0.5 transition-all cursor-pointer"
                >
                  <Folder className="w-5 h-5 text-primary-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-ink-900 dark:text-white truncate flex-1">{folder.name}</span>
                  <button onClick={(e) => deleteFolder(folder.id, e)} className="opacity-0 group-hover:opacity-100 w-7 h-7 grid place-items-center rounded-lg text-ink-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 transition-all" title="Delete folder">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Files */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 p-4 animate-pulse">
                <div className="w-12 h-12 rounded-xl bg-ink-100 dark:bg-ink-800" />
                <div className="mt-4 h-3 bg-ink-100 dark:bg-ink-800 rounded w-3/4" />
                <div className="mt-2 h-2.5 bg-ink-100 dark:bg-ink-800 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 && folders.length === 0 ? (
          <div className="rounded-2xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 py-20 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-ink-100 dark:bg-ink-800 grid place-items-center">
              <Folder className="w-8 h-8 text-ink-400" />
            </div>
            <p className="mt-4 font-display font-semibold text-ink-900 dark:text-white">{query ? 'No matching files' : 'This folder is empty'}</p>
            <p className="mt-1 text-sm text-ink-500">{query ? 'Try a different search.' : 'Upload a file or create a folder.'}</p>
          </div>
        ) : filtered.length === 0 ? null : (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-400 mb-3">Files</h2>
            {view === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filtered.map((file) => {
                  const { Icon, color, bg } = getFileMeta(file.mimeType);
                  const isSel = selected.has(file.id);
                  return (
                    <div key={file.id} className={`group relative rounded-2xl border bg-white dark:bg-ink-900 p-4 transition-all ${isSel ? 'border-primary-500 ring-2 ring-primary-500/30' : 'border-ink-200 dark:border-ink-800 hover:shadow-card hover:-translate-y-0.5'}`}>
                      <button
                        onClick={() => toggleSelect(file.id)}
                        className={`absolute top-3 left-3 z-10 transition-opacity ${isSel || selectionMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        aria-label="Select file"
                      >
                        {isSel ? <CheckSquare className="w-5 h-5 text-primary-600" /> : <Square className="w-5 h-5 text-ink-400" />}
                      </button>
                      <div className="flex items-start justify-between">
                        <div onClick={() => openFile(file)} className={`w-12 h-12 rounded-xl grid place-items-center ${bg} ml-6 cursor-pointer`} title="Open preview">
                          <Icon className={`w-6 h-6 ${color}`} />
                        </div>
                        <div className="flex items-center gap-1">
                          {file.isEncrypted && <Lock className="w-3.5 h-3.5 text-ink-400" />}
                          {file.isChunked && <span className="text-[10px] font-mono font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 px-1.5 py-0.5 rounded">{file.partCount}×</span>}
                        </div>
                      </div>
                      {renaming === file.id ? (
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => submitRename(file.id)}
                          onKeyDown={(e) => { if (e.key === 'Enter') submitRename(file.id); if (e.key === 'Escape') setRenaming(null); }}
                          className="mt-4 w-full text-sm px-2 py-1 rounded border border-primary-500 bg-white dark:bg-ink-800 text-ink-900 dark:text-white focus:outline-none"
                        />
                      ) : (
                        <p onClick={() => openFile(file)} className="mt-4 text-sm font-medium text-ink-900 dark:text-white truncate cursor-pointer hover:text-primary-600 dark:hover:text-primary-400" title={file.displayFilename}>{file.displayFilename}</p>
                      )}
                      <p className="text-xs text-ink-400 font-mono mt-0.5">{formatFileSize(file.fileSize)}</p>
                      <div className="mt-3 pt-3 border-t border-ink-100 dark:border-ink-800 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => window.open(fileApi.download(file.id), '_blank')} className="flex-1 grid place-items-center py-1.5 rounded-lg text-ink-500 hover:bg-primary-50 dark:hover:bg-primary-950/40 hover:text-primary-600 transition-colors" title="Download"><Download className="w-4 h-4" /></button>
                        <button onClick={() => { setRenaming(file.id); setRenameValue(file.displayFilename); }} className="flex-1 grid place-items-center py-1.5 rounded-lg text-ink-500 hover:bg-primary-50 dark:hover:bg-primary-950/40 hover:text-primary-600 transition-colors" title="Rename"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleShare(file.id)} className="flex-1 grid place-items-center py-1.5 rounded-lg text-ink-500 hover:bg-primary-50 dark:hover:bg-primary-950/40 hover:text-primary-600 transition-colors" title="Share"><Share2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(file.id)} className="flex-1 grid place-items-center py-1.5 rounded-lg text-ink-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 overflow-hidden divide-y divide-ink-100 dark:divide-ink-800">
                {filtered.map((file) => {
                  const { Icon, color, bg } = getFileMeta(file.mimeType);
                  const isSel = selected.has(file.id);
                  return (
                    <div key={file.id} className={`group flex items-center gap-3 px-4 py-3 transition-colors ${isSel ? 'bg-primary-50 dark:bg-primary-950/30' : 'hover:bg-ink-50 dark:hover:bg-ink-950/40'}`}>
                      <button onClick={() => toggleSelect(file.id)} aria-label="Select file">
                        {isSel ? <CheckSquare className="w-4.5 h-4.5 text-primary-600" /> : <Square className="w-4.5 h-4.5 text-ink-300" />}
                      </button>
                      <div onClick={() => openFile(file)} className={`w-10 h-10 rounded-lg grid place-items-center flex-shrink-0 ${bg} cursor-pointer`}><Icon className={`w-5 h-5 ${color}`} /></div>
                      <div className="min-w-0 flex-1">
                        {renaming === file.id ? (
                          <input
                            autoFocus value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => submitRename(file.id)}
                            onKeyDown={(e) => { if (e.key === 'Enter') submitRename(file.id); if (e.key === 'Escape') setRenaming(null); }}
                            className="w-full text-sm px-2 py-1 rounded border border-primary-500 bg-white dark:bg-ink-800 text-ink-900 dark:text-white focus:outline-none"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <p onClick={() => openFile(file)} className="text-sm font-medium text-ink-900 dark:text-white truncate cursor-pointer hover:text-primary-600 dark:hover:text-primary-400">{file.displayFilename}</p>
                            {file.isEncrypted && <Lock className="w-3.5 h-3.5 text-ink-400 flex-shrink-0" />}
                            {file.isChunked && <span className="text-[10px] font-mono font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 px-1.5 py-0.5 rounded flex-shrink-0">{file.partCount}×</span>}
                          </div>
                        )}
                        <p className="text-xs text-ink-400 font-mono">{formatFileSize(file.fileSize)} · {new Date(file.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => window.open(fileApi.download(file.id), '_blank')} className="w-8 h-8 grid place-items-center rounded-lg text-ink-500 hover:bg-primary-50 dark:hover:bg-primary-950/40 hover:text-primary-600 transition-colors" title="Download"><Download className="w-4 h-4" /></button>
                        <button onClick={() => { setRenaming(file.id); setRenameValue(file.displayFilename); }} className="w-8 h-8 grid place-items-center rounded-lg text-ink-500 hover:bg-primary-50 dark:hover:bg-primary-950/40 hover:text-primary-600 transition-colors" title="Rename"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleShare(file.id)} className="w-8 h-8 grid place-items-center rounded-lg text-ink-500 hover:bg-primary-50 dark:hover:bg-primary-950/40 hover:text-primary-600 transition-colors" title="Share"><Share2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(file.id)} className="w-8 h-8 grid place-items-center rounded-lg text-ink-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Move modal */}
      {moveOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/50 backdrop-blur-sm p-4" onClick={() => setMoveOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 shadow-card p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-lg text-ink-900 dark:text-white">Move {selected.size} file(s)</h3>
              <button onClick={() => setMoveOpen(false)} className="w-8 h-8 grid place-items-center rounded-lg text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-1 max-h-72 overflow-y-auto">
              <button onClick={() => doMove('root')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm text-ink-700 dark:text-ink-200 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors">
                <Home className="w-4 h-4 text-ink-400" /> Home (root)
              </button>
              {moveTargets.map((folder) => (
                <button key={folder.id} onClick={() => doMove(folder.id)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm text-ink-700 dark:text-ink-200 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors">
                  <Folder className="w-4 h-4 text-primary-500" /> {folder.name}
                </button>
              ))}
              {moveTargets.length === 0 && <p className="text-sm text-ink-400 px-3 py-4 text-center">No folders yet. Create one first.</p>}
            </div>
          </div>
        </div>
      )}
      {/* File viewer */}
      {viewerFile && <FileViewer file={viewerFile} onClose={() => setViewerFile(null)} />}
    </div>
  );
}

export default Dashboard;
