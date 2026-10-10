'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Circle, Flame, Plus, ChevronLeft, ChevronRight, Trash2, Clock3, RefreshCw, AlertTriangle, Pencil } from 'lucide-react';
import type { Habit, CalendarEvent } from '@/lib/types';

type ViewMode = 'habits' | 'calendar';

function dateKeyLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
function shiftDays(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  result.setHours(12, 0, 0, 0);
  return result;
}
function startOfWeek(date: Date): Date {
  const result = new Date(date);
  result.setHours(12, 0, 0, 0);
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
}
function formatLocalDateTimeInput(date: Date): string {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
}
function getStreak(completedDatesJson: string[]): number {
  const completed = new Set(completedDatesJson);
  let cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  let key = dateKeyLocal(cursor);
  if (!completed.has(key)) {
    cursor = shiftDays(cursor, -1);
    key = dateKeyLocal(cursor);
    if (!completed.has(key)) return 0;
  }
  let streak = 0;
  while (completed.has(key) && streak < 1000) {
    streak += 1;
    cursor = shiftDays(cursor, -1);
    key = dateKeyLocal(cursor);
  }
  return streak;
}
function localEventDateKey(event: CalendarEvent): string {
  if (event.isAllDay && /^\d{4}-\d{2}-\d{2}$/.test(event.startAt)) return event.startAt;
  const date = new Date(event.startAt);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: event.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const partMap = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${partMap.year}-${partMap.month}-${partMap.day}`;
}
function formatEventDate(event: CalendarEvent): string {
  if (event.isAllDay && /^\d{4}-\d{2}-\d{2}$/.test(event.startAt)) {
    const [year, month, day] = event.startAt.split('-').map(Number);
    return new Date(year, month - 1, day, 12).toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  return new Date(event.startAt).toLocaleString('vi-VN', {
    timeZone: event.timezone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CalendarHabitsApp() {
  const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh';
  const [view, setView] = useState<ViewMode>('habits');
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [habits, setHabits] = useState<Habit[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasMoreHabits, setHasMoreHabits] = useState(false);
  const [hasMoreEvents, setHasMoreEvents] = useState(false);
  const [nextHabitOffset, setNextHabitOffset] = useState(0);
  const [nextEventOffset, setNextEventOffset] = useState(0);
  const [loadingMoreHabits, setLoadingMoreHabits] = useState(false);
  const [loadingMoreEvents, setLoadingMoreEvents] = useState(false);
  const [pendingHabitDate, setPendingHabitDate] = useState<string | null>(null);
  const [showInactiveHabits, setShowInactiveHabits] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitTarget, setNewHabitTarget] = useState('Hàng ngày');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventAllDay, setEventAllDay] = useState(false);
  const [eventStart, setEventStart] = useState(() => formatLocalDateTimeInput(new Date(Date.now() + 30 * 60_000)));
  const [eventEnd, setEventEnd] = useState(() => formatLocalDateTimeInput(new Date(Date.now() + 90 * 60_000)));

  const monday = useMemo(() => startOfWeek(weekAnchor), [weekAnchor]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => shiftDays(monday, index)), [monday]);
  const todayKey = dateKeyLocal(new Date());
  const weekStartKey = dateKeyLocal(weekDays[0]);
  const weekEndKey = dateKeyLocal(weekDays[6]);
  const weekEvents = useMemo(() => events.filter((event) => {
    const key = localEventDateKey(event);
    return key >= weekStartKey && key <= weekEndKey;
  }), [events, weekEndKey, weekStartKey]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [habitResponse, eventResponse] = await Promise.all([
        fetch('/api/admin/habits?limit=100&offset=0', { cache: 'no-store' }),
        fetch('/api/admin/calendar-events?limit=100&offset=0', { cache: 'no-store' }),
      ]);
      const [habitPayload, eventPayload] = await Promise.all([
        habitResponse.json().catch(() => ({})),
        eventResponse.json().catch(() => ({})),
      ]);
      if (!habitResponse.ok) throw new Error(habitPayload.error || 'Không thể tải dữ liệu thói quen.');
      if (!eventResponse.ok) throw new Error(eventPayload.error || 'Không thể tải dữ liệu lịch.');
      const habitRows = Array.isArray(habitPayload.habits) ? habitPayload.habits as Habit[] : [];
      const eventRows = Array.isArray(eventPayload.events) ? eventPayload.events as CalendarEvent[] : [];
      setHabits(habitRows);
      setEvents(eventRows);
      setNextHabitOffset(habitRows.length);
      setNextEventOffset(eventRows.length);
      setHasMoreHabits(Boolean(habitPayload.pagination?.hasMore));
      setHasMoreEvents(Boolean(eventPayload.pagination?.hasMore));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể tải dữ liệu lịch và thói quen.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => { void loadData(); });
  }, [loadData]);

  const loadMoreHabits = async () => {
    if (!hasMoreHabits || loadingMoreHabits) return;
    setLoadingMoreHabits(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/habits?limit=100&offset=${nextHabitOffset}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Không thể tải thêm thói quen.');
      const rows = Array.isArray(payload.habits) ? payload.habits as Habit[] : [];
      setHabits((previous) => {
        const known = new Set(previous.map((item) => item.id));
        return [...previous, ...rows.filter((item) => !known.has(item.id))];
      });
      setNextHabitOffset((previous) => previous + rows.length);
      setHasMoreHabits(Boolean(payload.pagination?.hasMore));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể tải thêm thói quen.');
    } finally {
      setLoadingMoreHabits(false);
    }
  };

  const loadMoreEvents = async () => {
    if (!hasMoreEvents || loadingMoreEvents) return;
    setLoadingMoreEvents(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/calendar-events?limit=100&offset=${nextEventOffset}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Không thể tải thêm sự kiện.');
      const rows = Array.isArray(payload.events) ? payload.events as CalendarEvent[] : [];
      setEvents((previous) => {
        const known = new Set(previous.map((item) => item.id));
        return [...previous, ...rows.filter((item) => !known.has(item.id))];
      });
      setNextEventOffset((previous) => previous + rows.length);
      setHasMoreEvents(Boolean(payload.pagination?.hasMore));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể tải thêm sự kiện.');
    } finally {
      setLoadingMoreEvents(false);
    }
  };

  const toggleCompletion = async (habit: Habit, day: string) => {
    const id = `${habit.id}:${day}`;
    setPendingHabitDate(id);
    setError(null);
    setNotice(null);
    const done = habit.completedDatesJson.includes(day);
    try {
      const response = await fetch(`/api/admin/habits/${encodeURIComponent(habit.id)}/completion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: day, completed: !done }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Không thể lưu lần hoàn thành.');
      setHabits((previous) => previous.map((item) => item.id === habit.id ? payload.habit as Habit : item));
      setNotice(done ? 'Đã bỏ đánh dấu ngày này.' : 'Đã lưu lần hoàn thành thói quen.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Lưu lần hoàn thành thất bại.');
    } finally {
      setPendingHabitDate(null);
    }
  };

  const createHabit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newHabitName.trim()) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch('/api/admin/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newHabitName.trim(), target: newHabitTarget }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Không tạo được thói quen.');
      setHabits((previous) => [...previous, payload.habit as Habit]);
      setNewHabitName('');
      setNotice('Đã tạo thói quen và lưu vào database.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không tạo được thói quen.');
    } finally {
      setSaving(false);
    }
  };

  const deleteHabit = async (habit: Habit) => {
    if (!window.confirm(`Xóa thói quen “${habit.name}” và lịch sử hoàn thành của nó?`)) return;
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/habits/${habit.id}`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Không xóa được thói quen.');
      setHabits((previous) => previous.filter((item) => item.id !== habit.id));
      setNotice('Đã xóa thói quen.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không xóa được thói quen.');
    }
  };

  const clearEventForm = () => {
    setEditingEventId(null);
    setEventTitle('');
    setEventDescription('');
    setEventAllDay(false);
    setEventStart(formatLocalDateTimeInput(new Date(Date.now() + 30 * 60_000)));
    setEventEnd(formatLocalDateTimeInput(new Date(Date.now() + 90 * 60_000)));
  };

  const editEvent = (item: CalendarEvent) => {
    setEditingEventId(item.id);
    setEventTitle(item.title);
    setEventDescription(item.description || '');
    setEventAllDay(item.isAllDay);
    setEventStart(item.isAllDay
      ? (/^\d{4}-\d{2}-\d{2}$/.test(item.startAt) ? item.startAt : localEventDateKey(item))
      : formatLocalDateTimeInput(new Date(item.startAt)));
    setEventEnd(item.endAt
      ? item.isAllDay
        ? (/^\d{4}-\d{2}-\d{2}$/.test(item.endAt) ? item.endAt : localEventDateKey({ ...item, startAt: item.endAt }))
        : formatLocalDateTimeInput(new Date(item.endAt))
      : '');
    setView('calendar');
    setError(null);
    setNotice('Đang sửa sự kiện. Thời gian được hiển thị theo múi giờ của trình duyệt.');
  };

  const toggleEventAllDay = (enabled: boolean) => {
    if (enabled) {
      setEventStart(eventStart ? dateKeyLocal(new Date(eventStart)) : dateKeyLocal(new Date()));
      setEventEnd(eventEnd ? dateKeyLocal(new Date(eventEnd)) : '');
    } else {
      setEventStart(eventStart
        ? formatLocalDateTimeInput(new Date(/^\d{4}-\d{2}-\d{2}$/.test(eventStart) ? `${eventStart}T12:00:00` : eventStart))
        : formatLocalDateTimeInput(new Date(Date.now() + 30 * 60_000)));
      setEventEnd(eventEnd
        ? formatLocalDateTimeInput(new Date(/^\d{4}-\d{2}-\d{2}$/.test(eventEnd) ? `${eventEnd}T12:00:00` : eventEnd))
        : '');
    }
    setEventAllDay(enabled);
  };

  const createEvent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!eventTitle.trim() || !eventStart) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const isEditing = editingEventId !== null;
      const url = isEditing
        ? `/api/admin/calendar-events/${encodeURIComponent(editingEventId)}`
        : '/api/admin/calendar-events';
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: eventTitle.trim(),
          description: eventDescription.trim(),
          startAt: eventAllDay ? eventStart : new Date(eventStart).toISOString(),
          endAt: eventEnd ? eventAllDay ? eventEnd : new Date(eventEnd).toISOString() : null,
          timezone: browserTimeZone,
          isAllDay: eventAllDay,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || (isEditing ? 'Không cập nhật được sự kiện.' : 'Không tạo được sự kiện.'));
      const saved = payload.event as CalendarEvent;
      setEvents((previous) => {
        const withoutSaved = previous.filter((item) => item.id !== saved.id);
        return [...withoutSaved, saved].sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt) || a.id.localeCompare(b.id));
      });
      clearEventForm();
      setNotice(isEditing
        ? 'Đã cập nhật sự kiện lịch nội bộ.'
        : 'Đã lưu sự kiện vào lịch nội bộ. Chưa có đồng bộ tới Google Calendar hay lịch bên ngoài.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không lưu được sự kiện.');
    } finally {
      setSaving(false);
    }
  };

  const toggleHabitActive = async (habit: Habit) => {
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/habits/${encodeURIComponent(habit.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !habit.isActive }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Không cập nhật được trạng thái thói quen.');
      setHabits((previous) => previous.map((item) => item.id === habit.id ? payload.habit as Habit : item));
      setNotice(habit.isActive ? 'Đã tạm dừng thói quen; lịch sử vẫn được giữ.' : 'Đã kích hoạt lại thói quen.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không cập nhật được trạng thái thói quen.');
    }
  };

  const deleteEvent = async (item: CalendarEvent) => {
    if (!window.confirm(`Xóa sự kiện “${item.title}”?`)) return;
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/calendar-events/${item.id}`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Không xóa được sự kiện.');
      setEvents((previous) => previous.filter((event) => event.id !== item.id));
      if (editingEventId === item.id) clearEventForm();
      setNotice('Đã xóa sự kiện khỏi lịch nội bộ.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không xóa được sự kiện.');
    }
  };

  const activeHabits = habits.filter((habit) => habit.isActive);
  const visibleHabits = showInactiveHabits ? habits : activeHabits;
  const completedToday = activeHabits.filter((habit) => habit.completedDatesJson.includes(todayKey)).length;
  const longestStreak = activeHabits.reduce((max, habit) => Math.max(max, getStreak(habit.completedDatesJson)), 0);

  return (
    <div className="flex flex-col h-full bg-stone-950 text-stone-200">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-stone-800 bg-stone-900/60">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl"><CalendarDays className="w-5 h-5" /></div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-white">Lịch nội bộ & Habit Tracker</h1>
            <p className="text-xs text-stone-400">Sự kiện và lần hoàn thành được lưu thật, theo ngày và múi giờ tường minh.</p>
          </div>
        </div>
        <button onClick={() => void loadData()} disabled={loading} title="Làm mới dữ liệu" className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-50"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>

      <div className="flex gap-2 px-5 py-3 border-b border-stone-800">
        <button onClick={() => setView('habits')} className={`px-3 py-2 rounded-lg text-xs font-semibold ${view === 'habits' ? 'bg-emerald-600 text-white' : 'bg-stone-900 text-stone-400'}`}>Thói quen</button>
        <button onClick={() => setView('calendar')} className={`px-3 py-2 rounded-lg text-xs font-semibold ${view === 'calendar' ? 'bg-emerald-600 text-white' : 'bg-stone-900 text-stone-400'}`}>Lịch nội bộ</button>
      </div>

      <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-5">
        {error && <div role="alert" className="p-3 rounded-xl border border-rose-800 bg-rose-950/30 text-rose-200 text-xs flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{error}</div>}
        {notice && <div role="status" className="p-3 rounded-xl border border-emerald-800 bg-emerald-950/20 text-emerald-200 text-xs">{notice}</div>}
        {loading && <div className="text-xs text-stone-500">Đang tải dữ liệu đã lưu...</div>}

        {view === 'habits' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-stone-900 border border-stone-800"><div className="text-xs text-stone-500">Thói quen đang theo dõi</div><div className="text-2xl font-bold mt-1">{activeHabits.length}</div></div>
              <div className="p-4 rounded-xl bg-stone-900 border border-stone-800"><div className="text-xs text-stone-500">Đã hoàn thành hôm nay</div><div className="text-2xl font-bold mt-1 text-emerald-300">{completedToday}<span className="text-sm text-stone-500"> / {activeHabits.length}</span></div></div>
              <div className="p-4 rounded-xl bg-stone-900 border border-stone-800"><div className="text-xs text-stone-500">Chuỗi hiện tại dài nhất</div><div className="text-2xl font-bold mt-1 text-amber-300 flex gap-2 items-center"><Flame className="w-5 h-5" />{longestStreak} ngày</div></div>
            </div>

            <form onSubmit={createHabit} className="grid grid-cols-1 sm:grid-cols-[1fr_180px_auto] gap-2 p-4 rounded-xl bg-stone-900/70 border border-stone-800">
              <input value={newHabitName} onChange={(event) => setNewHabitName(event.target.value)} placeholder="Tên thói quen mới..." maxLength={160} className="min-w-0 bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-xs" />
              <input value={newHabitTarget} onChange={(event) => setNewHabitTarget(event.target.value)} placeholder="Mục tiêu (vd. 30 phút)" maxLength={100} className="min-w-0 bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-xs" />
              <button type="submit" disabled={saving || !newHabitName.trim()} className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-50"><Plus className="w-4 h-4" />Tạo thói quen</button>
            </form>

            <section className="rounded-2xl border border-stone-800 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-stone-900">
                <div><h2 className="text-sm font-bold text-white">Tiến độ theo tuần</h2><p className="text-[11px] text-stone-500 mt-1">{weekStartKey} — {weekEndKey}</p></div>
                <div className="flex flex-wrap items-center gap-1">
                  <button type="button" onClick={() => setShowInactiveHabits((value) => !value)} className="px-2.5 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-[11px]" aria-pressed={showInactiveHabits}>
                    {showInactiveHabits ? 'Ẩn thói quen tạm dừng' : 'Hiện thói quen tạm dừng'}
                  </button>
                  <button onClick={() => setWeekAnchor((date) => shiftDays(date, -7))} className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700" title="Tuần trước"><ChevronLeft className="w-4 h-4" /></button>
                  <button onClick={() => setWeekAnchor((date) => shiftDays(date, 7))} className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700" title="Tuần sau"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
              {visibleHabits.length === 0 ? <div className="p-8 text-center text-xs text-stone-500">{habits.length > 0 ? 'Không có thói quen đang hoạt động. Hiện các thói quen tạm dừng để kích hoạt lại.' : 'Chưa có thói quen. Tạo thói quen phía trên để bắt đầu; không có dữ liệu mẫu giả.'}</div> : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-xs">
                    <thead className="bg-stone-950/60 text-stone-500"><tr><th className="text-left p-3 font-medium">Thói quen</th><th className="text-left p-3 font-medium">Mục tiêu</th><th className="p-3 font-medium">Chuỗi</th>{weekDays.map((day) => <th key={dateKeyLocal(day)} className="p-2 text-center font-medium"><span className="block">{day.toLocaleDateString('vi-VN', { weekday: 'short' })}</span><span className={`block mt-1 ${dateKeyLocal(day) === todayKey ? 'text-emerald-300' : ''}`}>{day.getDate()}</span></th>)}<th className="p-3"></th></tr></thead>
                    <tbody className="divide-y divide-stone-800">
                      {visibleHabits.map((habit) => <tr key={habit.id} className={`hover:bg-stone-900/40 ${!habit.isActive ? 'opacity-75' : ''}`}>
                        <td className="p-3 font-semibold text-stone-200">{habit.name}{!habit.isActive && <span className="ml-2 rounded bg-stone-800 px-1.5 py-0.5 text-[10px] font-normal text-stone-400">Tạm dừng</span>}</td><td className="p-3 text-stone-500">{habit.target}</td><td className="p-3 text-center"><span className="inline-flex items-center gap-1 text-amber-300"><Flame className="w-3 h-3" />{getStreak(habit.completedDatesJson)}</span></td>
                        {weekDays.map((day) => { const key = dateKeyLocal(day); const done = habit.completedDatesJson.includes(key); const busy = pendingHabitDate === `${habit.id}:${key}`; return <td key={key} className="p-2 text-center"><button onClick={() => void toggleCompletion(habit, key)} disabled={!habit.isActive || busy || Boolean(pendingHabitDate)} aria-label={`${done ? 'Bỏ hoàn thành' : 'Đánh dấu hoàn thành'}: ${habit.name} ngày ${key}`} className="inline-flex p-1 rounded-lg hover:bg-stone-800 disabled:opacity-40">{done ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Circle className="w-5 h-5 text-stone-700 hover:text-stone-400" />}</button></td>; })}
                        <td className="p-3 text-right"><div className="flex justify-end gap-1"><button onClick={() => void toggleHabitActive(habit)} title={habit.isActive ? 'Tạm dừng thói quen' : 'Kích hoạt lại thói quen'} className="rounded-lg px-2 py-1 text-[10px] text-stone-400 hover:bg-stone-800 hover:text-white">{habit.isActive ? 'Tạm dừng' : 'Kích hoạt'}</button><button onClick={() => void deleteHabit(habit)} title="Xóa thói quen" className="p-1.5 rounded-lg text-stone-600 hover:bg-rose-950/30 hover:text-rose-300"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
                      </tr>)}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
            {!loading && hasMoreHabits && (
              <div className="flex justify-center">
                <button type="button" onClick={() => void loadMoreHabits()} disabled={loadingMoreHabits}
                  className="rounded-lg border border-stone-700 bg-stone-900 px-4 py-2 text-xs text-stone-300 hover:text-white disabled:opacity-50">
                  {loadingMoreHabits ? 'Đang tải...' : 'Tải thêm thói quen'}
                </button>
              </div>
            )}
          </>
        )}

        {view === 'calendar' && (
          <>
            <section className="p-4 rounded-2xl border border-stone-800 bg-stone-900/60 space-y-4">
              <div><h2 className="text-sm font-bold text-white">{editingEventId ? 'Sửa sự kiện lịch' : 'Tạo sự kiện lịch'}</h2><p className="text-[11px] text-stone-500 mt-1">Lưu trong Personal Web OS; chưa gửi hoặc đồng bộ tới nhà cung cấp lịch bên ngoài.</p></div>
              <form onSubmit={createEvent} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="md:col-span-2 space-y-1"><span className="text-[10px] uppercase tracking-wider text-stone-500">Tiêu đề</span><input value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} maxLength={180} placeholder="Ví dụ: Ôn tập Toán — Dao động điều hòa" className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-xs" /></label>
                <label className="md:col-span-2 inline-flex items-center gap-2 text-xs text-stone-300"><input type="checkbox" checked={eventAllDay} onChange={(event) => toggleEventAllDay(event.target.checked)} className="accent-emerald-500" />Sự kiện cả ngày</label>
                <label className="space-y-1"><span className="text-[10px] uppercase tracking-wider text-stone-500">{eventAllDay ? 'Ngày bắt đầu' : 'Bắt đầu (giờ máy local)'}</span><input type={eventAllDay ? 'date' : 'datetime-local'} value={eventStart} onChange={(event) => setEventStart(event.target.value)} className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-xs" /></label>
                <label className="space-y-1"><span className="text-[10px] uppercase tracking-wider text-stone-500">{eventAllDay ? 'Ngày kết thúc (tùy chọn)' : 'Kết thúc (tùy chọn)'}</span><input type={eventAllDay ? 'date' : 'datetime-local'} value={eventEnd} onChange={(event) => setEventEnd(event.target.value)} className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-xs" /></label>
                <label className="md:col-span-2 space-y-1"><span className="text-[10px] uppercase tracking-wider text-stone-500">Ghi chú</span><textarea value={eventDescription} onChange={(event) => setEventDescription(event.target.value)} maxLength={6000} rows={2} className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-xs resize-y" placeholder="Mô tả hoặc việc cần chuẩn bị..." /></label>
                <div className="md:col-span-2 flex flex-wrap items-center gap-2">
                  <button type="submit" disabled={saving || !eventTitle.trim() || !eventStart} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-50"><Plus className="w-4 h-4" />{saving ? 'Đang lưu...' : editingEventId ? 'Lưu thay đổi' : 'Lưu sự kiện'}</button>
                  {editingEventId && <button type="button" onClick={clearEventForm} disabled={saving} className="px-3 py-2 rounded-lg border border-stone-700 text-xs text-stone-300 hover:bg-stone-800 disabled:opacity-50">Hủy sửa</button>}
                </div>
              </form>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-bold text-white">Lịch tuần</h2><p className="text-[11px] text-stone-500">{weekStartKey} — {weekEndKey}</p></div><div className="flex gap-1"><button onClick={() => setWeekAnchor((date) => shiftDays(date, -7))} className="p-2 rounded-lg bg-stone-900 hover:bg-stone-800" title="Tuần trước"><ChevronLeft className="w-4 h-4" /></button><button onClick={() => setWeekAnchor((date) => shiftDays(date, 7))} className="p-2 rounded-lg bg-stone-900 hover:bg-stone-800" title="Tuần sau"><ChevronRight className="w-4 h-4" /></button></div></div>
              {weekEvents.length === 0 ? <div className="p-8 rounded-xl border border-dashed border-stone-800 text-center text-xs text-stone-500">Tuần này chưa có sự kiện đã lưu.</div> : weekDays.map((day) => { const key = dateKeyLocal(day); const dayEvents = weekEvents.filter((item) => localEventDateKey(item) === key); if (!dayEvents.length) return null; return <div key={key} className="rounded-xl border border-stone-800 overflow-hidden"><div className={`px-3 py-2 text-xs font-semibold ${key === todayKey ? 'bg-emerald-950/50 text-emerald-200' : 'bg-stone-900 text-stone-300'}`}>{day.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}</div>{dayEvents.map((item) => <div key={item.id} className="flex items-start justify-between gap-3 p-3 bg-stone-950/40 border-t border-stone-800"><div className="min-w-0"><div className="text-xs font-semibold text-stone-100">{item.title}</div><div className="mt-1 text-[10px] text-stone-500 flex items-center gap-1"><Clock3 className="w-3 h-3" />{formatEventDate(item)} · {item.timezone}</div>{item.description && <p className="mt-1 text-[11px] text-stone-400 whitespace-pre-wrap">{item.description}</p>}</div><div className="flex shrink-0 items-center gap-1"><button onClick={() => editEvent(item)} title="Sửa sự kiện" aria-label={`Sửa sự kiện: ${item.title}`} className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-800 hover:text-emerald-300"><Pencil className="w-3.5 h-3.5" /></button><button onClick={() => void deleteEvent(item)} title="Xóa sự kiện" aria-label={`Xóa sự kiện: ${item.title}`} className="p-1.5 rounded-lg text-stone-600 hover:bg-rose-950/30 hover:text-rose-300"><Trash2 className="w-3.5 h-3.5" /></button></div></div>)}</div>; })}
              {!loading && hasMoreEvents && (
                <div className="flex justify-center">
                  <button type="button" onClick={() => void loadMoreEvents()} disabled={loadingMoreEvents}
                    className="rounded-lg border border-stone-700 bg-stone-900 px-4 py-2 text-xs text-stone-300 hover:text-white disabled:opacity-50">
                    {loadingMoreEvents ? 'Đang tải...' : 'Tải thêm sự kiện'}
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
