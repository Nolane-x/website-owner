'use client';

import React, { useState } from 'react';
import { Calendar as CalendarIcon, CheckCircle2, Circle, Flame, Plus, Zap } from 'lucide-react';

interface Habit {
  id: string;
  name: string;
  target: string;
  streak: number;
  completedDays: number[]; // 0..6
}

export function CalendarHabitsApp() {
  const [currentDate] = useState(new Date());
  const [habits, setHabits] = useState<Habit[]>([
    { id: 'h1', name: 'Đọc tài liệu kiến trúc & RFC', target: 'Mỗi ngày 30p', streak: 12, completedDays: [0, 1, 2, 3, 4] },
    { id: 'h2', name: 'Tập thể dục & Rèn luyện thể lực', target: '45 phút', streak: 8, completedDays: [1, 2, 4] },
    { id: 'h3', name: 'Ôn tập Spaced Repetition Anki', target: 'Hoàn thành thẻ đến hạn', streak: 15, completedDays: [0, 1, 2, 3, 4, 5] },
    { id: 'h4', name: 'Viết nhật ký Daily Journal', target: 'Mỗi tối', streak: 6, completedDays: [0, 2, 3, 4] },
  ]);

  const [newHabitName, setNewHabitName] = useState('');

  const daysOfWeek = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  const toggleDay = (habitId: string, dayIndex: number) => {
    setHabits(prev => prev.map(h => {
      if (h.id === habitId) {
        const exists = h.completedDays.includes(dayIndex);
        const nextDays = exists ? h.completedDays.filter(d => d !== dayIndex) : [...h.completedDays, dayIndex];
        return { ...h, completedDays: nextDays };
      }
      return h;
    }));
  };

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;
    const newH: Habit = {
      id: `h-${Date.now()}`,
      name: newHabitName.trim(),
      target: 'Hàng ngày',
      streak: 1,
      completedDays: [new Date().getDay() === 0 ? 6 : new Date().getDay() - 1],
    };
    setHabits([...habits, newH]);
    setNewHabitName('');
  };

  return (
    <div className="flex flex-col h-full bg-stone-950 text-stone-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-900/60">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Calendar, Habits & Life Dashboard</h1>
            <p className="text-xs text-stone-400">Lịch trình làm việc cá nhân, chuỗi thói quen và nhịp sinh học</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-semibold text-stone-300">
          <span className="px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800">
            {currentDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* Streak Highlight Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-between">
            <div>
              <span className="text-xs text-stone-400 uppercase tracking-wider font-semibold">Chuỗi thói quen dài nhất</span>
              <div className="text-3xl font-extrabold text-amber-400 mt-1 flex items-center">
                <Flame className="w-6 h-6 mr-1.5 text-amber-500 fill-amber-500" /> 15 ngày
              </div>
            </div>
            <span className="text-xs text-stone-500">Ôn tập Anki</span>
          </div>

          <div className="p-5 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-between">
            <div>
              <span className="text-xs text-stone-400 uppercase tracking-wider font-semibold">Tỷ lệ kỷ luật tuần này</span>
              <div className="text-3xl font-extrabold text-emerald-400 mt-1">82%</div>
            </div>
            <span className="text-xs text-stone-500">Đạt mục tiêu</span>
          </div>

          <div className="p-5 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-between">
            <div>
              <span className="text-xs text-stone-400 uppercase tracking-wider font-semibold">Năng lượng Tập trung</span>
              <div className="text-3xl font-extrabold text-sky-400 mt-1 flex items-center">
                <Zap className="w-5 h-5 mr-1 text-sky-400" /> Tối ưu
              </div>
            </div>
            <span className="text-xs text-stone-500">Buổi sáng</span>
          </div>
        </div>

        {/* Habit Tracker Board */}
        <div className="p-6 rounded-3xl bg-stone-900 border border-stone-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center">
              <Flame className="w-4 h-4 mr-1.5 text-amber-400" /> Bảng Theo Dõi Thói Quen (Weekly Habit Tracker)
            </h2>

            <form onSubmit={handleAddHabit} className="flex items-center space-x-2">
              <input
                type="text"
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                placeholder="Thêm thói quen mới..."
                className="px-3 py-1.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center transition"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Thêm
              </button>
            </form>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-800 text-stone-400 font-semibold">
                  <th className="py-3 px-4">Thói quen</th>
                  <th className="py-3 px-2 text-center">Mục tiêu</th>
                  <th className="py-3 px-2 text-center">Chuỗi</th>
                  {daysOfWeek.map((d, i) => (
                    <th key={i} className="py-3 px-2 text-center w-12">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60">
                {habits.map((h) => (
                  <tr key={h.id} className="hover:bg-stone-800/30 transition">
                    <td className="py-3.5 px-4 font-semibold text-stone-200">{h.name}</td>
                    <td className="py-3.5 px-2 text-center text-stone-400 text-[11px]">{h.target}</td>
                    <td className="py-3.5 px-2 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 font-bold text-[11px]">
                        {h.streak}d
                      </span>
                    </td>
                    {daysOfWeek.map((_, dayIndex) => {
                      const done = h.completedDays.includes(dayIndex);
                      return (
                        <td key={dayIndex} className="py-3.5 px-2 text-center">
                          <button
                            onClick={() => toggleDay(h.id, dayIndex)}
                            className="p-1 rounded-lg hover:bg-stone-800 transition"
                          >
                            {done ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            ) : (
                              <Circle className="w-5 h-5 text-stone-600 hover:text-stone-400" />
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
