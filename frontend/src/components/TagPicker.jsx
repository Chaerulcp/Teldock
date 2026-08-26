import { useState, useEffect } from 'react';
import { X, Plus, Check, Tag as TagIcon, Loader2 } from 'lucide-react';
import { tagApi, fileApi } from '../services/api';
import { toast } from 'react-toastify';

const PALETTE = ['#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', '#ec4899', '#14b8a6', '#64748b'];

/**
 * Modal to assign/create tags for a file.
 */
function TagPicker({ file, onClose, onChanged }) {
  const [tags, setTags] = useState([]);
  const [selected, setSelected] = useState(new Set((file.tags || []).map((t) => t.id)));
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PALETTE[0]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await tagApi.list();
      setTags(res.data.data.tags || []);
    } catch {
      toast.error('Failed to load tags');
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
  }, []);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const createTag = async () => {
    if (!newName.trim()) return;
    try {
      const res = await tagApi.create({ name: newName.trim(), color: newColor });
      const tag = res.data.data.tag;
      setTags((prev) => [...prev, { ...tag, fileCount: 0 }].sort((a, b) => a.name.localeCompare(b.name)));
      setSelected((prev) => new Set(prev).add(tag.id));
      setNewName('');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to create tag');
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await fileApi.setTags(file.id, [...selected]);
      toast.success('Tags updated');
      if (onChanged) onChanged();
      onClose();
    } catch {
      toast.error('Failed to update tags');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-5 h-14 border-b border-ink-100 dark:border-ink-800">
          <TagIcon className="w-5 h-5 text-primary-500" />
          <div className="min-w-0 flex-1">
            <p className="font-display font-semibold text-ink-900 dark:text-white leading-none">Tags</p>
            <p className="text-xs text-ink-400 mt-0.5 truncate">{file.displayFilename}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="grid place-items-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {tags.length === 0 && <p className="text-sm text-ink-400">No tags yet. Create one below.</p>}
                {tags.map((t) => {
                  const on = selected.has(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => toggle(t.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${on ? 'text-white border-transparent' : 'text-ink-600 dark:text-ink-300 border-ink-200 dark:border-ink-700'}`}
                      style={on ? { backgroundColor: t.color } : {}}
                    >
                      {on && <Check className="w-3.5 h-3.5" />}
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: on ? 'rgba(255,255,255,0.7)' : t.color }} />
                      {t.name}
                    </button>
                  );
                })}
              </div>

              {/* Create new tag */}
              <div className="mt-5 pt-4 border-t border-ink-100 dark:border-ink-800">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-2">New tag</p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {PALETTE.map((c) => (
                      <button key={c} onClick={() => setNewColor(c)} className={`w-5 h-5 rounded-full ${newColor === c ? 'ring-2 ring-offset-2 ring-ink-400 dark:ring-offset-ink-900' : ''}`} style={{ backgroundColor: c }} aria-label={`color ${c}`} />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') createTag(); }}
                    placeholder="Tag name"
                    className="flex-1 px-3 py-2 rounded-lg text-sm border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-800 text-ink-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button onClick={createTag} disabled={!newName.trim()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-200 text-sm font-medium hover:bg-ink-200 dark:hover:bg-ink-700 disabled:opacity-50 transition-colors">
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-ink-100 dark:border-ink-800">
          <button onClick={save} disabled={saving} className="flex-1 inline-flex items-center justify-center gap-2 bg-primary-600 text-white py-2.5 rounded-xl font-medium hover:bg-primary-500 disabled:opacity-60 transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
          </button>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl font-medium text-ink-600 dark:text-ink-300 border border-ink-200 dark:border-ink-800 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default TagPicker;
