'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Scratchpad, ScratchpadColor } from '@/lib/types';
import { Plus, Trash2, Pin, Loader2 } from 'lucide-react';

const COLORS: { id: ScratchpadColor; bg: string; border: string; text: string }[] = [
  { id: 'amber', bg: 'bg-amber-950/40', border: 'border-amber-800/60', text: 'text-amber-200' },
  { id: 'emerald', bg: 'bg-emerald-950/40', border: 'border-emerald-800/60', text: 'text-emerald-200' },
  { id: 'sky', bg: 'bg-sky-950/40', border: 'border-sky-800/60', text: 'text-sky-200' },
  { id: 'rose', bg: 'bg-rose-950/40', border: 'border-rose-800/60', text: 'text-rose-200' },
  { id: 'violet', bg: 'bg-violet-950/40', border: 'border-violet-800/60', text: 'text-violet-200' },
  { id: 'stone', bg: 'bg-stone-900/60', border: 'border-stone-800', text: 'text-stone-300' },
];

export function NotesApp() {
  const [notes, setNotes] = useState<Scratchpad[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeNote, setActiveNote] = useState<Scratchpad | null>(null);

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/scratchpads');
      if (res.ok) {
        const data = await res.json();
        setNotes(data.scratchpads || []);
        if (data.scratchpads?.length > 0 && !activeNote) {
          setActiveNote(data.scratchpads[0]);
        }
      }
    } catch (e) {
      console.error('Lỗi tải ghi chú:', e);
    } finally {
      setLoading(false);
    }
  }, [activeNote]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleCreate = async (color: ScratchpadColor = 'amber') => {
    try {
      const res = await fetch('/api/admin/scratchpads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Ghi chú mới',
          content: '',
          color,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setNotes((prev) => [data.scratchpad, ...prev]);
        setActiveNote(data.scratchpad);
      }
    } catch (e) {
      console.error('Lỗi tạo ghi chú:', e);
    }
  };

  const handleUpdate = async (id: string, updates: Partial<Scratchpad>) => {
    setNotes((prev: Scratchpad[]) =>
      prev.map((n) => (n.id === id ? { ...n, ...updates } : n))
    );
    if (activeNote?.id === id) {
      setActiveNote((prev: Scratchpad | null) => (prev ? { ...prev, ...updates } : null));
    }

    try {
      await fetch(`/api/admin/scratchpads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch (e) {
      console.error('Lỗi cập nhật ghi chú:', e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa ghi chú này?')) return;
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (activeNote?.id === id) setActiveNote(null);

    try {
      await fetch(`/api/admin/scratchpads/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Lỗi xóa ghi chú:', e);
    }
  };

  return (
    <div className="flex h-full bg-stone-950 text-stone-200 text-xs">
      {/* Sidebar note list */}
      <div className="w-56 border-r border-stone-800 flex flex-col bg-stone-900/40">
        <div className="p-2 border-b border-stone-800 flex items-center justify-between">
          <span className="font-semibold text-stone-300">Ghi chú nháp</span>
          <button
            onClick={() => handleCreate('amber')}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] transition"
          >
            <Plus className="w-3 h-3" />
            <span>Mới</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {loading ? (
            <div className="p-4 text-center text-stone-500">
              <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />
            </div>
          ) : notes.length === 0 ? (
            <div className="p-4 text-center text-stone-600">Chưa có ghi chú nào</div>
          ) : (
            notes.map((note) => {
              const colorDef = COLORS.find((c) => c.id === note.color) || COLORS[0];
              return (
                <button
                  key={note.id}
                  onClick={() => setActiveNote(note)}
                  className={`w-full text-left p-2 rounded-lg border transition flex items-start justify-between ${
                    colorDef.bg
                  } ${colorDef.border} ${
                    activeNote?.id === note.id ? 'ring-1 ring-white/30' : 'opacity-85 hover:opacity-100'
                  }`}
                >
                  <div className="truncate flex-1">
                    <p className={`font-semibold truncate ${colorDef.text}`}>
                      {note.title || 'Không tiêu đề'}
                    </p>
                    <p className="text-[10px] text-stone-400 truncate mt-0.5">
                      {note.content || 'Trống...'}
                    </p>
                  </div>
                  {note.isPinned && <Pin className="w-3 h-3 text-amber-400 shrink-0 ml-1" />}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Note editor */}
      <div className="flex-1 flex flex-col bg-stone-950">
        {activeNote ? (
          <div className="flex-1 flex flex-col p-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-3">
              <input
                type="text"
                value={activeNote.title || ''}
                onChange={(e) => handleUpdate(activeNote.id, { title: e.target.value })}
                placeholder="Tiêu đề ghi chú..."
                className="bg-transparent font-bold text-base text-white focus:outline-hidden flex-1"
              />

              <div className="flex items-center gap-1.5">
                {/* Color swatches */}
                {COLORS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleUpdate(activeNote.id, { color: c.id })}
                    className={`w-4 h-4 rounded-full border ${c.bg} ${
                      activeNote.color === c.id ? 'border-white ring-1 ring-white' : 'border-stone-700'
                    }`}
                  />
                ))}

                <div className="w-[1px] h-4 bg-stone-800 mx-1" />

                <button
                  onClick={() => handleUpdate(activeNote.id, { isPinned: !activeNote.isPinned })}
                  className={`p-1 rounded hover:bg-stone-800 ${
                    activeNote.isPinned ? 'text-amber-400' : 'text-stone-500'
                  }`}
                >
                  <Pin className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleDelete(activeNote.id)}
                  className="p-1 rounded hover:bg-rose-950 text-stone-500 hover:text-rose-400 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <textarea
              value={activeNote.content || ''}
              onChange={(e) => handleUpdate(activeNote.id, { content: e.target.value })}
              placeholder="Nhập nội dung ghi chú ở đây..."
              className="flex-1 bg-transparent resize-none focus:outline-hidden text-stone-200 leading-relaxed text-sm select-text"
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-stone-600">
            <p>Chọn một ghi chú hoặc tạo mới để bắt đầu viết</p>
          </div>
        )}
      </div>
    </div>
  );
}
