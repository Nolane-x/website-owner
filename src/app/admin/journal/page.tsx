'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Calendar,
  Save,
  CheckCircle2,
  Smile,
  Flame,
  Coffee,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { playSound } from '@/lib/audio/sound-fx';
import { ContentItem } from '@/lib/types';

type JournalMood = 'productive' | 'peaceful' | 'challenging' | 'inspired';

const MOODS: { id: JournalMood; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; color: string }[] = [
  { id: 'productive', label: 'Năng suất cao', icon: Flame, color: 'text-amber-500' },
  { id: 'peaceful', label: 'Bình yên', icon: Coffee, color: 'text-emerald-500' },
  { id: 'inspired', label: 'Cảm hứng', icon: Sparkles, color: 'text-sky-500' },
  { id: 'challenging', label: 'Thử thách', icon: Smile, color: 'text-rose-500' },
];

export default function DailyJournalPage() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [journalEntries, setJournalEntries] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Current selected day form state
  const [entryTitle, setEntryTitle] = useState('');
  const [entryContent, setEntryContent] = useState('');
  const [entryMood, setEntryMood] = useState<JournalMood>('productive');
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);

  const fetchJournalEntries = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/content?type=journal');
      if (res.ok) {
        const data = await res.json();
        const items: ContentItem[] = data.items || [];
        setJournalEntries(items);

        // Find entry for selected date
        const match = items.find((i) => i.slug === `journal-${selectedDate}`);
        if (match) {
          setCurrentEntryId(match.id);
          setEntryTitle(match.title);
          setEntryContent(match.content || '');
          const meta = (match.metadata || {}) as { mood?: JournalMood };
          if (meta.mood) setEntryMood(meta.mood);
        } else {
          setCurrentEntryId(null);
          setEntryTitle(`Nhật ký ngày ${selectedDate}`);
          setEntryContent('');
          setEntryMood('productive');
        }
      }
    } catch (err) {
      console.error('Lỗi tải nhật ký:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJournalEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      title: entryTitle.trim() || `Nhật ký ngày ${selectedDate}`,
      slug: `journal-${selectedDate}`,
      type: 'journal',
      content: entryContent,
      description: entryContent.slice(0, 150),
      status: 'PUBLISHED',
      visibility: 'PRIVATE',
      metadata: {
        date: selectedDate,
        mood: entryMood,
        wordCount: entryContent.trim().split(/\s+/).filter(Boolean).length,
      },
    };

    try {
      if (currentEntryId) {
        const res = await fetch(`/api/admin/content/${currentEntryId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          playSound('chime');
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 2000);
          fetchJournalEntries();
        }
      } else {
        const res = await fetch('/api/admin/content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          playSound('chime');
          const data = await res.json();
          setCurrentEntryId(data.item?.id || null);
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 2000);
          fetchJournalEntries();
        }
      }
    } catch (err) {
      console.error('Lỗi lưu nhật ký:', err);
    } finally {
      setSaving(false);
    }
  };

  // Generate 365 Days Activity Matrix for Heatmap
  const heatmapDays = useMemo(() => {
    const today = new Date();
    const days: { date: string; count: number; level: number }[] = [];

    // Map of dates with journal entries
    const dateCounts: Record<string, number> = {};
    journalEntries.forEach((entry) => {
      const meta = (entry.metadata || {}) as { date?: string; wordCount?: number };
      const d = meta.date || entry.createdAt.split('T')[0];
      const words = meta.wordCount || 10;
      dateCounts[d] = words;
    });

    // 52 weeks * 7 days = 364 days back
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = dateCounts[dateStr] || 0;

      let level = 0;
      if (count > 0 && count < 50) level = 1;
      else if (count >= 50 && count < 150) level = 2;
      else if (count >= 150 && count < 350) level = 3;
      else if (count >= 350) level = 4;

      days.push({ date: dateStr, count, level });
    }

    return days;
  }, [journalEntries]);

  const LEVEL_COLORS = [
    'bg-[var(--bg-surface-subtle)] border-[var(--border-color)]/30',
    'bg-emerald-500/30 border-emerald-500/40',
    'bg-emerald-500/50 border-emerald-500/60',
    'bg-emerald-500/75 border-emerald-500/80',
    'bg-emerald-400 border-emerald-300',
  ];

  const wordCount = entryContent.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2.5">
            <BookOpen className="text-[var(--accent)]" size={26} />
            Nhật ký Điều hành & Bản đồ Hoạt động 365 Ngày
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Ghi chép hành trình mỗi ngày, theo dõi mật độ làm việc và dòng suy nghĩ cá nhân.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              playSound('pop');
              setSelectedDate(e.target.value);
            }}
            className="text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-[var(--text-primary)] font-mono focus:outline-none"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
          >
            Hôm nay
          </Button>
        </div>
      </div>

      {/* 365-Day Activity Heatmap */}
      <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-2">
            <Calendar size={14} className="text-[var(--accent)]" />
            Bản đồ Hoạt động (365 Ngày qua)
          </span>
          <span className="text-xs text-[var(--text-muted)] font-mono">
            {journalEntries.length} nhật ký đã lưu
          </span>
        </div>

        {/* Heatmap Grid */}
        <div className="overflow-x-auto pb-2">
          <div className="inline-grid grid-rows-7 grid-flow-col gap-1.5 min-w-[700px]">
            {heatmapDays.map((d) => (
              <button
                key={d.date}
                onClick={() => {
                  playSound('pop');
                  setSelectedDate(d.date);
                }}
                className={`w-3 h-3 rounded-sm border transition-all ${LEVEL_COLORS[d.level]} ${
                  selectedDate === d.date ? 'ring-2 ring-[var(--accent)] ring-offset-1 scale-125' : ''
                }`}
                title={`${d.date}: ${d.count > 0 ? `${d.count} từ` : 'Chưa có nhật ký'}`}
              />
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-2 text-[11px] text-[var(--text-muted)] pt-1">
          <span>Ít hơn</span>
          <div className="flex gap-1">
            {LEVEL_COLORS.map((col, idx) => (
              <div key={idx} className={`w-3 h-3 rounded-sm border ${col}`} />
            ))}
          </div>
          <span>Nhiều hơn</span>
        </div>
      </div>

      {/* Journal Entry Editor Form */}
      <div className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-5 shadow-sm space-y-4">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <input
              type="text"
              required
              value={entryTitle}
              onChange={(e) => setEntryTitle(e.target.value)}
              placeholder="Tiêu đề nhật ký hôm nay..."
              className="text-lg font-bold bg-transparent text-[var(--text-primary)] focus:outline-none w-full"
            />

            <div className="flex items-center gap-2 shrink-0">
              {saveSuccess && (
                <span className="text-xs text-emerald-400 font-medium flex items-center gap-1 animate-in fade-in">
                  <CheckCircle2 size={13} /> Đã lưu!
                </span>
              )}
              <Button type="submit" disabled={saving} className="flex items-center gap-1.5 text-xs">
                <Save size={14} />
                {saving ? 'Đang lưu...' : 'Lưu nhật ký'}
              </Button>
            </div>
          </div>

          {/* Mood Selector */}
          <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-color)]">
            <span className="text-xs text-[var(--text-muted)] shrink-0">Tâm trạng hôm nay:</span>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => {
                const Icon = m.icon;
                const isSelected = entryMood === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      playSound('pop');
                      setEntryMood(m.id);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all ${
                      isSelected
                        ? 'bg-[var(--accent)]/15 border-[var(--accent)] text-[var(--accent)] shadow-sm'
                        : 'bg-[var(--bg-surface-subtle)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
                    }`}
                  >
                    <Icon size={14} className={m.color} />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Text Area Content */}
          <div className="relative">
            <textarea
              rows={14}
              value={entryContent}
              onChange={(e) => setEntryContent(e.target.value)}
              placeholder={`Viết những suy nghĩ, việc đã hoàn thành hoặc bài học hôm nay...\n\nGợi ý: Bạn có thể liên kết wiki-link bằng cách gõ [[Tên dự án hoặc bài viết]].`}
              className="w-full text-sm bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] rounded-xl p-4 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] font-sans leading-relaxed resize-y"
            />

            <div className="absolute bottom-3 right-3 text-xs text-[var(--text-muted)] font-mono bg-[var(--bg-surface)] px-2 py-1 rounded-md border border-[var(--border-color)]">
              {wordCount} từ · {entryContent.length} ký tự
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
