'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Scratchpad, ScratchpadColor } from '@/lib/types';
import { Plus, Trash2, Pin, Loader2, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

const COLORS: { id: ScratchpadColor; bg: string; border: string; text: string }[] = [
  { id: 'amber', bg: 'bg-amber-950/40', border: 'border-amber-800/60', text: 'text-amber-200' },
  { id: 'emerald', bg: 'bg-emerald-950/40', border: 'border-emerald-800/60', text: 'text-emerald-200' },
  { id: 'sky', bg: 'bg-sky-950/40', border: 'border-sky-800/60', text: 'text-sky-200' },
  { id: 'rose', bg: 'bg-rose-950/40', border: 'border-rose-800/60', text: 'text-rose-200' },
  { id: 'violet', bg: 'bg-violet-950/40', border: 'border-violet-800/60', text: 'text-violet-200' },
  { id: 'stone', bg: 'bg-stone-900/60', border: 'border-stone-800', text: 'text-stone-300' },
];

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export function NotesApp() {
  const [notes, setNotes] = useState<Scratchpad[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeNote, setActiveNote] = useState<Scratchpad | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const revisionRef = useRef(0);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const response = await fetch('/api/admin/scratchpads', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Không tải được ghi chú.');
      const loaded = Array.isArray(payload.scratchpads) ? payload.scratchpads as Scratchpad[] : [];
      setNotes(loaded);
      setActiveNote((current) => loaded.find((note) => note.id === current?.id) ?? loaded[0] ?? null);
      setSaveState('idle');
      setErrorMessage(null);
    } catch (caught) {
      setListError(caught instanceof Error ? caught.message : 'Không tải được ghi chú.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => { void fetchNotes(); });
  }, [fetchNotes]);

  const updateNote = (id: string, updates: Partial<Scratchpad>) => {
    revisionRef.current += 1;
    setNotes((previous) => previous.map((note) => note.id === id ? { ...note, ...updates } : note));
    setActiveNote((previous) => previous?.id === id ? { ...previous, ...updates } : previous);
    setSaveState('dirty');
    setErrorMessage(null);
  };

  // Debounced autosave. Writes are serialized so an older request cannot finish after a newer write.
  useEffect(() => {
    if (!activeNote || saveState !== 'dirty') return;
    const noteSnapshot = activeNote;
    const revision = revisionRef.current;
    const timer = window.setTimeout(() => {
      setSaveState('saving');
      saveQueueRef.current = saveQueueRef.current.catch(() => undefined).then(async () => {
        const response = await fetch(`/api/admin/scratchpads/${noteSnapshot.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: noteSnapshot.title,
            content: noteSnapshot.content,
            color: noteSnapshot.color,
            isPinned: noteSnapshot.isPinned,
          }),
        });
        const payload = await response.json().catch(() => ({})) as { scratchpad?: Scratchpad; error?: string };
        if (!response.ok) throw new Error(payload.error || `Lưu thất bại (HTTP ${response.status}).`);
        if (revision === revisionRef.current) {
          const saved = payload.scratchpad ?? noteSnapshot;
          setNotes((previous) => previous.map((note) => note.id === saved.id ? saved : note));
          setActiveNote((previous) => previous?.id === saved.id ? saved : previous);
          setSaveState('saved');
          setErrorMessage(null);
        }
      }).catch((caught: unknown) => {
        if (revision === revisionRef.current) {
          setSaveState('error');
          setErrorMessage(caught instanceof Error ? caught.message : 'Không lưu được ghi chú.');
        }
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [activeNote, saveState]);

  const handleCreate = async (color: ScratchpadColor = 'amber') => {
    if (saveState === 'dirty' || saveState === 'saving' || saveState === 'error') {
      const confirmed = window.confirm('Ghi chú hiện tại có thay đổi chưa được xác nhận là đã lưu. Tạo ghi chú mới có thể bỏ các thay đổi chưa lưu. Tiếp tục?');
      if (!confirmed) return;
    }
    setIsCreating(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/admin/scratchpads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Ghi chú mới', content: '', color }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Không tạo được ghi chú.');
      const created = payload.scratchpad as Scratchpad;
      setNotes((previous) => [created, ...previous]);
      revisionRef.current += 1;
      setActiveNote(created);
      setSaveState('saved');
      setErrorMessage(null);
    } catch (caught) {
      setErrorMessage(caught instanceof Error ? caught.message : 'Không tạo được ghi chú.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    const note = notes.find((item) => item.id === id);
    if (!window.confirm(`Xóa ghi chú “${note?.title || 'Không tiêu đề'}”? Thao tác này không thể hoàn tác tại đây.`)) return;
    if (activeNote?.id === id) {
      // Invalidate and cancel any pending debounce before deleting this note.
      revisionRef.current += 1;
      setSaveState('idle');
    }
    setDeletingId(id);
    setErrorMessage(null);
    try {
      await saveQueueRef.current.catch(() => undefined);
      const response = await fetch(`/api/admin/scratchpads/${id}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || `Xóa thất bại (HTTP ${response.status}).`);
      const remaining = notes.filter((item) => item.id !== id);
      setNotes(remaining);
      if (activeNote?.id === id) {
        revisionRef.current += 1;
        setActiveNote(remaining[0] ?? null);
        setSaveState('idle');
      }
    } catch (caught) {
      setErrorMessage(caught instanceof Error ? caught.message : 'Không xóa được ghi chú.');
      if (activeNote?.id === id) setSaveState('dirty');
    } finally {
      setDeletingId(null);
    }
  };

  const saveLabel = saveState === 'saving' ? 'Đang lưu…'
    : saveState === 'dirty' ? 'Có thay đổi chưa lưu'
    : saveState === 'saved' ? 'Đã lưu vào database'
    : saveState === 'error' ? 'Lưu thất bại'
    : 'Sẵn sàng';

  return (
    <div className="flex h-full min-w-0 bg-stone-950 text-stone-200 text-xs">
      <aside className="w-56 max-w-[42%] border-r border-stone-800 flex flex-col bg-stone-900/40 shrink-0">
        <div className="p-2 border-b border-stone-800 flex items-center justify-between gap-2">
          <span className="font-semibold text-stone-300">Ghi chú nhanh</span>
          <button onClick={() => void handleCreate('amber')} disabled={isCreating} className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] transition disabled:opacity-50">
            {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            <span>Mới</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {loading ? <div className="p-4 text-center text-stone-500"><Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />Đang tải…</div>
            : listError ? <div className="p-3 text-rose-300 space-y-2"><p>{listError}</p><button onClick={() => void fetchNotes()} className="inline-flex items-center gap-1 text-[11px]"><RefreshCw className="w-3 h-3" />Thử lại</button></div>
            : notes.length === 0 ? <div className="p-4 text-center text-stone-500">Chưa có ghi chú nào</div>
            : notes.map((note) => {
              const colorDef = COLORS.find((color) => color.id === note.color) || COLORS[0];
              return <button key={note.id} onClick={() => {
                if (activeNote?.id === note.id) return;
                if (saveState === 'dirty' || saveState === 'saving' || saveState === 'error') {
                  const confirmed = window.confirm('Ghi chú hiện tại có thay đổi chưa được xác nhận là đã lưu. Chuyển đi có thể bỏ thay đổi chưa lưu. Tiếp tục?');
                  if (!confirmed) return;
                }
                revisionRef.current += 1;
                setActiveNote(note);
                setSaveState('idle');
                setErrorMessage(null);
              }} className={`w-full text-left p-2 rounded-lg border transition flex items-start justify-between gap-2 ${colorDef.bg} ${colorDef.border} ${activeNote?.id === note.id ? 'ring-1 ring-white/30' : 'opacity-85 hover:opacity-100'}`}>
                <div className="truncate flex-1 min-w-0">
                  <p className={`font-semibold truncate ${colorDef.text}`}>{note.title || 'Không tiêu đề'}</p>
                  <p className="text-[10px] text-stone-400 truncate mt-0.5">{note.content || 'Trống…'}</p>
                </div>
                {note.isPinned && <Pin className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />}
              </button>;
            })}
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col bg-stone-950">
        {activeNote ? (
          <div className="flex-1 min-h-0 flex flex-col p-3 md:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-800 mb-3">
              <input type="text" value={activeNote.title || ''} maxLength={300} onChange={(event) => updateNote(activeNote.id, { title: event.target.value })} placeholder="Tiêu đề ghi chú…" className="bg-transparent font-bold text-base text-white focus:outline-hidden flex-1 min-w-[120px]" />
              <div className="flex items-center gap-1.5">
                {COLORS.map((color) => <button key={color.id} aria-label={`Đổi màu ${color.id}`} onClick={() => updateNote(activeNote.id, { color: color.id })} className={`w-4 h-4 rounded-full border ${color.bg} ${activeNote.color === color.id ? 'border-white ring-1 ring-white' : 'border-stone-700'}`} />)}
                <div className="w-px h-4 bg-stone-800 mx-1" />
                <button aria-label={activeNote.isPinned ? 'Bỏ ghim ghi chú' : 'Ghim ghi chú'} onClick={() => updateNote(activeNote.id, { isPinned: !activeNote.isPinned })} className={`p-1 rounded hover:bg-stone-800 ${activeNote.isPinned ? 'text-amber-400' : 'text-stone-500'}`}><Pin className="w-3.5 h-3.5" /></button>
                <button aria-label="Xóa ghi chú" disabled={deletingId === activeNote.id} onClick={() => void handleDelete(activeNote.id)} className="p-1 rounded hover:bg-rose-950 text-stone-500 hover:text-rose-400 transition disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            <div className={`mb-2 flex items-center gap-1.5 text-[10px] ${saveState === 'error' ? 'text-rose-300' : saveState === 'saved' ? 'text-emerald-300' : 'text-stone-500'}`}>
              {saveState === 'error' ? <AlertTriangle className="w-3 h-3" /> : saveState === 'saved' ? <CheckCircle2 className="w-3 h-3" /> : saveState === 'saving' ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              <span>{saveLabel}. Autosave sau 700 ms không gõ.</span>
            </div>
            {errorMessage && <div role="alert" className="mb-2 p-2 rounded border border-rose-800/70 bg-rose-950/20 text-rose-200 text-[11px]">{errorMessage}</div>}
            <textarea value={activeNote.content || ''} onChange={(event) => updateNote(activeNote.id, { content: event.target.value })} placeholder="Viết ghi chú tại đây…" className="flex-1 min-h-[120px] bg-transparent resize-none focus:outline-hidden text-stone-200 leading-relaxed text-sm select-text" />
            <div className="pt-2 text-[10px] text-stone-600">Nếu server trả lỗi, trạng thái sẽ chuyển sang “Lưu thất bại”; nội dung đang sửa vẫn còn trên màn hình để bạn thử lưu lại bằng cách chỉnh sửa thêm.</div>
          </div>
        ) : <div className="flex-1 flex flex-col items-center justify-center text-stone-500"><p>{loading ? 'Đang tải…' : 'Chọn một ghi chú hoặc tạo mới để bắt đầu viết.'}</p></div>}
      </main>
    </div>
  );
}
