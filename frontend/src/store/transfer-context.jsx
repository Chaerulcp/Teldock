import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { fileApi } from '../services/api';

const TransferContext = createContext(null);

export function useTransfers() {
  return useContext(TransferContext);
}

let idSeq = 0;

export function TransferProvider({ children }) {
  const [transfers, setTransfers] = useState([]); // {id, name, progress, status}
  const [open, setOpen] = useState(false);
  const listeners = useRef(new Set());

  const onComplete = useCallback((cb) => {
    listeners.current.add(cb);
    return () => listeners.current.delete(cb);
  }, []);

  const update = useCallback((id, patch) => {
    setTransfers((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const clearCompleted = useCallback(() => {
    setTransfers((prev) => prev.filter((t) => t.status === 'uploading' || t.status === 'queued'));
  }, []);

  /**
   * Upload one or more files sequentially. Returns a promise that resolves
   * when all are done. `opts`: { folderId, encrypt }.
   */
  const uploadFiles = useCallback(async (files, opts = {}) => {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    setOpen(true);

    const entries = arr.map((file) => ({
      id: ++idSeq,
      name: file.name,
      progress: 0,
      status: 'queued',
      file,
    }));
    setTransfers((prev) => [...entries, ...prev]);

    for (const entry of entries) {
      update(entry.id, { status: 'uploading' });
      const formData = new FormData();
      formData.append('file', entry.file);
      if (opts.folderId) formData.append('folderId', opts.folderId);
      if (opts.encrypt) formData.append('encrypt', 'true');
      try {
        await fileApi.upload(formData, (evt) => {
          if (evt.total) update(entry.id, { progress: Math.round((evt.loaded / evt.total) * 100) });
        });
        update(entry.id, { status: 'done', progress: 100 });
      } catch (err) {
        update(entry.id, { status: 'error', error: err.response?.data?.error || 'Upload failed' });
      }
    }

    // notify subscribers (e.g. dashboard) to reload
    listeners.current.forEach((cb) => cb());
  }, [update]);

  const value = { transfers, open, setOpen, uploadFiles, clearCompleted, onComplete };
  return <TransferContext.Provider value={value}>{children}</TransferContext.Provider>;
}
