'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  StickyNote,
  Plus,
  Trash2,
  Pin,
  Copy,
  Check,
} from 'lucide-react';
import { playSound } from '@/lib/audio/sound-fx';
import { Scratchpad, ScratchpadColor } from '@/lib/types';

const COLOR_MAP: Record<ScratchpadColor, { bg: string; border: string; accent: string; dot: string }> = {
  amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', accent: 'text-amber-400', dot: 'bg-amber-400' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', accent: 'text-emerald-400', dot: 'bg-emerald-400' },
  sky: { bg: 'bg-sky-500/10', border: 'border-sky-500/30', accent: 'text-sky-400', dot: 'bg-sky-400' },
  rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', accent: 'text-rose-400', dot: 'bg-rose-400' },
  violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/30', accent: 'text-violet-400', dot: 'bg-violet-400' },
  stone: { bg: 'bg-zinc-500/10', border: 'border-zinc-500/30', accent: 'text-zinc-400', dot: 'bg-zinc-400' },
};

const COLOR_KEYS: ScratchpadColor[] = ['amber', 'emerald', 'sky', 'rose', 'violet', 'stone'];

export function ScratchpadDesk() {
  const [notes, setNotes] = useState<Scratchpad[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const saveTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/scratchpads');
      if (res.ok) {
        const data = await res.json();
        setNotes(data.scratchpads || []);
      }
    } catch (err) {
      console.error('Lỗi tải ghi chú nháp:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/admin/scratchpads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Ghi chú mới',
          content: '',
          color: 'amber',
          isPinned: false,
        }),
      });
      if (res.ok) {
        playSound('snap');
        const data = await res.json();
        setNotes((prev) => [data.scratchpad, ...prev]);
      }
    } catch (err) {
      console.error('Lỗi tạo ghi chú:', err);
    }
  };

  const handleUpdate = (id: string, updates: Partial<Scratchpad>) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...updates } : n))
    );

    // Debounce save API
    if (saveTimeoutRef.current[id]) {
      clearTimeout(saveTimeoutRef.current[id]);
    }

    saveTimeoutRef.current[id] = setTimeout(async () => {
      try {
        await fetch(`/api/admin/scratchpads/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
      } catch (err) {
        console.error('Lỗi tự động lưu ghi chú:', err);
      }
    }, 600);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/scratchpads/${id}`, { method: 'DELETE' });
      if (res.ok) {
        playSound('pop');
        setNotes((prev) => prev.filter((n) => n.id !== id));
      }
    } catch (err) {
      console.error('Lỗi xóa ghi chú:', err);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    playSound('pop');
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StickyNote className="text-[var(--accent)]" size={20} />
          <h3 className="font-semibold text-base text-[var(--text-primary)]">
            Bàn làm việc Ghi chú nháp (Quick Scratchpad)
          </h3>
          <span className="text-xs text-[var(--text-muted)] font-mono">
            ({notes.length} mẩu giấy)
          </span>
        </div>

        <button
          onClick={handleCreate}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--accent)] hover:text-white transition-colors border border-[var(--border-color)] text-[var(--text-primary)]"
        >
          <Plus size={14} />
          Mẩu giấy mới
        </button>
      </div>

      {/* Grid of Sticky Notes */}
      {loading ? (
        <div className="py-8 text-center text-xs text-[var(--text-muted)]">
          Đang nạp ghi chú nháp...
        </div>
      ) : notes.length === 0 ? (
        <div className="p-8 text-center rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-surface)]">
          <p className="text-xs text-[var(--text-muted)] mb-2">
            Chưa có mẩu giấy nháp nào trên bàn làm việc.
          </p>
          <button
            onClick={handleCreate}
            className="text-xs text-[var(--accent)] hover:underline font-medium"
          >
            + Đặt một mẩu giấy nháp đầu tiên
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {notes.map((note) => {
            const colorCfg = COLOR_MAP[note.color] || COLOR_MAP.amber;
            return (
              <div
                key={note.id}
                className={`flex flex-col rounded-xl p-3.5 border transition-all shadow-sm relative group ${colorCfg.bg} ${colorCfg.border}`}
              >
                {/* Note Top Bar */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <input
                    type="text"
                    value={note.title || ''}
                    onChange={(e) => handleUpdate(note.id, { title: e.target.value })}
                    placeholder="Tiêu đề..."
                    className="bg-transparent font-semibold text-xs text-[var(--text-primary)] focus:outline-none w-full"
                  />

                  <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity shrink-0">
                    {/* Pin toggle */}
                    <button
                      onClick={() => {
                        playSound('snap');
                        handleUpdate(note.id, { isPinned: !note.isPinned });
                      }}
                      className={`p-1 rounded hover:bg-black/10 transition-colors ${
                        note.isPinned ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'
                      }`}
                      title={note.isPinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
                    >
                      <Pin size={12} className={note.isPinned ? 'fill-current' : ''} />
                    </button>

                    {/* Copy */}
                    <button
                      onClick={() => handleCopy(note.id, note.content)}
                      className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/10"
                      title="Sao chép nội dung"
                    >
                      {copiedId === note.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="p-1 rounded text-[var(--text-muted)] hover:text-rose-400 hover:bg-black/10"
                      title="Xóa mẩu giấy"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Content Textarea */}
                <textarea
                  rows={4}
                  value={note.content}
                  onChange={(e) => handleUpdate(note.id, { content: e.target.value })}
                  placeholder="Viết nháp nhanh suy nghĩ, dòng lệnh, ý tưởng..."
                  className="w-full bg-transparent text-xs text-[var(--text-primary)] resize-none focus:outline-none leading-relaxed placeholder:text-[var(--text-muted)]/60 flex-1"
                />

                {/* Color Chooser */}
                <div className="pt-2.5 mt-2 border-t border-[var(--border-color)]/40 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {COLOR_KEYS.map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          playSound('pop');
                          handleUpdate(note.id, { color: c });
                        }}
                        className={`w-3.5 h-3.5 rounded-full ${COLOR_MAP[c].dot} transition-transform ${
                          note.color === c ? 'scale-125 ring-2 ring-white/60' : 'opacity-60 hover:opacity-100'
                        }`}
                        title={c}
                      />
                    ))}
                  </div>

                  <span className="text-[10px] text-[var(--text-muted)] font-mono">
                    Tự động lưu
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
