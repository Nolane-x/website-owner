'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Circle, Flame, Plus, ChevronLeft, ChevronRight, Trash2, Clock3, RefreshCw, AlertTriangle } from 'lucide-react';
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
  const [pendingHabitDate, setPendingHabitDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitTarget, setNewHabitTarget] = useState('Hàng ngày');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
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
        fetch('/api/admin/habits', { cache: 'no-store' }),
        fetch('/api/admin/calendar-events?limit=250', { cache: 'no-store' }),
      ]);
      const [habitPayload, eventPayload] = await Promise.all([habitResponse.json(), eventResponse.json()]);
      if (!habitResponse.ok) throw new Error(habitPayload.error || 'Không thể tải dữ liệu thói quen.');
      if (!eventResponse.ok) throw new Error(eventPayload.error || 'Không thể tải dữ liệu lịch.');
      setHabits((habitPayload.habits || []) as Habit[]);
      setEvents((eventPayload.events || []) as CalendarEvent[]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể tải dữ liệu lịch và thói quen.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => { void loadData(); });
  }, [loadData]);

  const toggleCompletion = async (habit: Habit, day: string) => {
    const id = `${habit.id}:${day}`;
    setPendingHabitDate(id);
    setError(null);
    setNotice(null);
    const done = habit.completedDatesJson.includes(day);
    const completedDatesJson = done
      ? habit.completedDatesJson.filter((date) => date !== day)
      : [...habit.completedDatesJson, day];
    try {
      const response = await fetch(`/api/admin/habits/${habit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completedDatesJson }),
      });
      const payload = await response.json();
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

  const createEvent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!eventTitle.trim() || !eventStart) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch('/api/admin/calendar-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: eventTitle.trim(),
          description: eventDescription.trim(),
          startAt: new Date(eventStart).toISOString(),
          endAt: eventEnd ? new Date(eventEnd).toISOString() : null,
          timezone: browserTimeZone,
          isAllDay: false,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Không tạo được sự kiện.');
      setEvents((previous) => [...previous, payload.event as CalendarEvent].sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt)));
      setEventTitle('');
      setEventDescription('');
      setNotice('Đã lưu sự kiện vào lịch nội bộ. Chưa có đồng bộ tới Google Calendar hay lịch bên ngoài.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không tạo được sự kiện.');
    } finally {
      setSaving(false);
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
      setNotice('Đã xóa sự kiện khỏi lịch nội bộ.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không xóa được sự kiện.');
    }
  };

  const activeHabits = habits.filter((habit) => habit.isActive);
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
              <div className="flex items-center justify-between gap-3 p-4 bg-stone-900">
                <div><h2 className="text-sm font-bold text-white">Tiến độ theo tuần</h2><p className="text-[11px] text-stone-500 mt-1">{weekStartKey} — {weekEndKey}</p></div>
                <div className="flex gap-1"><button onClick={() => setWeekAnchor((date) => shiftDays(date, -7))} className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700" title="Tuần trước"><ChevronLeft className="w-4 h-4" /></button><button onClick={() => setWeekAnchor((date) => shiftDays(date, 7))} className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700" title="Tuần sau"><ChevronRight className="w-4 h-4" /></button></div>
              </div>
              {activeHabits.length === 0 ? <div className="p-8 text-center text-xs text-stone-500">Chưa có thói quen. Tạo thói quen phía trên để bắt đầu; không có dữ liệu mẫu giả.</div> : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-xs">
                    <thead className="bg-stone-950/60 text-stone-500"><tr><th className="text-left p-3 font-medium">Thói quen</th><th className="text-left p-3 font-medium">Mục tiêu</th><th className="p-3 font-medium">Chuỗi</th>{weekDays.map((day) => <th key={dateKeyLocal(day)} className="p-2 text-center font-medium"><span className="block">{day.toLocaleDateString('vi-VN', { weekday: 'short' })}</span><span className={`block mt-1 ${dateKeyLocal(day) === todayKey ? 'text-emerald-300' : ''}`}>{day.getDate()}</span></th>)}<th className="p-3"></th></tr></thead>
                    <tbody className="divide-y divide-stone-800">
                      {activeHabits.map((habit) => <tr key={habit.id} className="hover:bg-stone-900/40">
                        <td className="p-3 font-semibold text-stone-200">{habit.name}</td><td className="p-3 text-stone-500">{habit.target}</td><td className="p-3 text-center"><span className="inline-flex items-center gap-1 text-amber-300"><Flame className="w-3 h-3" />{getStreak(habit.completedDatesJson)}</span></td>
                        {weekDays.map((day) => { const key = dateKeyLocal(day); const done = habit.completedDatesJson.includes(key); const busy = pendingHabitDate === `${habit.id}:${key}`; return <td key={key} className="p-2 text-center"><button onClick={() => void toggleCompletion(habit, key)} disabled={busy || Boolean(pendingHabitDate)} aria-label={`${done ? 'Bỏ hoàn thành' : 'Đánh dấu hoàn thành'}: ${habit.name} ngày ${key}`} className="inline-flex p-1 rounded-lg hover:bg-stone-800 disabled:opacity-40">{done ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Circle className="w-5 h-5 text-stone-700 hover:text-stone-400" />}</button></td>; })}
                        <td className="p-3 text-right"><button onClick={() => void deleteHabit(habit)} title="Xóa thói quen" className="p-1.5 rounded-lg text-stone-600 hover:bg-rose-950/30 hover:text-rose-300"><Trash2 className="w-3.5 h-3.5" /></button></td>
                      </tr>)}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        {view === 'calendar' && (
          <>
            <section className="p-4 rounded-2xl border border-stone-800 bg-stone-900/60 space-y-4">
              <div><h2 className="text-sm font-bold text-white">Tạo sự kiện lịch</h2><p className="text-[11px] text-stone-500 mt-1">Lưu trong Personal Web OS; chưa gửi hoặc đồng bộ tới nhà cung cấp lịch bên ngoài.</p></div>
              <form onSubmit={createEvent} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="md:col-span-2 space-y-1"><span className="text-[10px] uppercase tracking-wider text-stone-500">Tiêu đề</span><input value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} maxLength={180} placeholder="Ví dụ: Ôn tập Toán — Dao động điều hòa" className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-xs" /></label>
                <label className="space-y-1"><span className="text-[10px] uppercase tracking-wider text-stone-500">Bắt đầu (giờ máy local)</span><input type="datetime-local" value={eventStart} onChange={(event) => setEventStart(event.target.value)} className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-xs" /></label>
                <label className="space-y-1"><span className="text-[10px] uppercase tracking-wider text-stone-500">Kết thúc (tùy chọn)</span><input type="datetime-local" value={eventEnd} onChange={(event) => setEventEnd(event.target.value)} className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-xs" /></label>
                <label className="md:col-span-2 space-y-1"><span className="text-[10px] uppercase tracking-wider text-stone-500">Ghi chú</span><textarea value={eventDescription} onChange={(event) => setEventDescription(event.target.value)} maxLength={6000} rows={2} className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-xs resize-y" placeholder="Mô tả hoặc việc cần chuẩn bị..." /></label>
                <div className="md:col-span-2"><button type="submit" disabled={saving || !eventTitle.trim() || !eventStart} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-50"><Plus className="w-4 h-4" />{saving ? 'Đang lưu...' : 'Lưu sự kiện'}</button></div>
              </form>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-bold text-white">Lịch tuần</h2><p className="text-[11px] text-stone-500">{weekStartKey} — {weekEndKey}</p></div><div className="flex gap-1"><button onClick={() => setWeekAnchor((date) => shiftDays(date, -7))} className="p-2 rounded-lg bg-stone-900 hover:bg-stone-800" title="Tuần trước"><ChevronLeft className="w-4 h-4" /></button><button onClick={() => setWeekAnchor((date) => shiftDays(date, 7))} className="p-2 rounded-lg bg-stone-900 hover:bg-stone-800" title="Tuần sau"><ChevronRight className="w-4 h-4" /></button></div></div>
              {weekEvents.length === 0 ? <div className="p-8 rounded-xl border border-dashed border-stone-800 text-center text-xs text-stone-500">Tuần này chưa có sự kiện đã lưu.</div> : weekDays.map((day) => { const key = dateKeyLocal(day); const dayEvents = weekEvents.filter((item) => localEventDateKey(item) === key); if (!dayEvents.length) return null; return <div key={key} className="rounded-xl border border-stone-800 overflow-hidden"><div className={`px-3 py-2 text-xs font-semibold ${key === todayKey ? 'bg-emerald-950/50 text-emerald-200' : 'bg-stone-900 text-stone-300'}`}>{day.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}</div>{dayEvents.map((item) => <div key={item.id} className="flex items-start justify-between gap-3 p-3 bg-stone-950/40 border-t border-stone-800"><div className="min-w-0"><div className="text-xs font-semibold text-stone-100">{item.title}</div><div className="mt-1 text-[10px] text-stone-500 flex items-center gap-1"><Clock3 className="w-3 h-3" />{formatEventDate(item)} · {item.timezone}</div>{item.description && <p className="mt-1 text-[11px] text-stone-400 whitespace-pre-wrap">{item.description}</p>}</div><button onClick={() => void deleteEvent(item)} title="Xóa sự kiện" className="p-1.5 rounded-lg text-stone-600 hover:bg-rose-950/30 hover:text-rose-300"><Trash2 className="w-3.5 h-3.5" /></button></div>)}</div>; })}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
