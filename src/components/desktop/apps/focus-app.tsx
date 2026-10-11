'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Target, Play, Pause, RotateCcw, Volume2, Maximize2, Minimize2 } from 'lucide-react';
import { ambientSynth } from '@/lib/audio/ambient-synth';
import { loadFocusPreferences, saveFocusPreferences } from '@/lib/audio/focus-preferences';
import { PREFERENCE_PERSISTENCE_EVENT, reportPreferencePersistence, type PreferencePersistenceResult } from '@/lib/persistence-events';

export function FocusApp() {
  const [initialPreferences] = useState(() => loadFocusPreferences());
  const [minutes, setMinutes] = useState(Math.floor(initialPreferences.remainingSeconds / 60));
  const [seconds, setSeconds] = useState(initialPreferences.remainingSeconds % 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'work' | 'shortBreak' | 'longBreak'>(initialPreferences.mode);
  const [sessionCount, setSessionCount] = useState(initialPreferences.sessionCount);
  const [sessionGoal, setSessionGoal] = useState(initialPreferences.sessionGoal);
  const [isZenMode, setIsZenMode] = useState(false);
  const [preferencesWarning, setPreferencesWarning] = useState<string | null>(null);

  // Sound Lab Faders
  const [rainVol, setRainVol] = useState(initialPreferences.rainVolume);
  const [wavesVol, setWavesVol] = useState(initialPreferences.wavesVolume);
  const [campfireVol, setCampfireVol] = useState(initialPreferences.campfireVolume);
  const countdownRef = useRef({ minutes, seconds, mode });

  useEffect(() => {
    countdownRef.current = { minutes, seconds, mode };
  }, [minutes, seconds, mode]);

  useEffect(() => {
    const handlePersistence = (event: Event) => {
      const detail = (event as CustomEvent<PreferencePersistenceResult>).detail;
      if (detail?.scope === 'focus-studio') setPreferencesWarning(detail.message);
    };
    window.addEventListener(PREFERENCE_PERSISTENCE_EVENT, handlePersistence);
    return () => window.removeEventListener(PREFERENCE_PERSISTENCE_EVENT, handlePersistence);
  }, []);

  useEffect(() => {
    const saved = saveFocusPreferences({
      mode,
      remainingSeconds: minutes * 60 + seconds,
      sessionCount,
      sessionGoal,
      rainVolume: rainVol,
      wavesVolume: wavesVol,
      campfireVolume: campfireVol,
    });
    reportPreferencePersistence('focus-studio', saved ? null : 'Không thể lưu cài đặt Focus Studio trên trình duyệt này.');
  }, [mode, minutes, seconds, sessionCount, sessionGoal, rainVol, wavesVol, campfireVol]);

  // Closing the app pauses the timer and stops its audio; preferences and remaining
  // time are saved locally and restored on the next open without autoplay.
  useEffect(() => () => { ambientSynth.stop(); }, []);

  // Keep a single interval for the whole running session. The previous effect
  // restarted a timer after every second/state update, adding avoidable work to
  // the main thread exactly while the user was interacting with the desktop.
  useEffect(() => {
    if (!isActive) return;
    const interval = window.setInterval(() => {
      const current = countdownRef.current;
      if (current.seconds > 0) {
        setSeconds(current.seconds - 1);
      } else if (current.minutes > 0) {
        setMinutes(current.minutes - 1);
        setSeconds(59);
      } else {
        setIsActive(false);
        ambientSynth.stop();
        if (current.mode === 'work') {
          setSessionCount((previous) => previous + 1);
          setMode('shortBreak');
          setMinutes(5);
          setSeconds(0);
        } else {
          setMode('work');
          setMinutes(25);
          setSeconds(0);
        }
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isActive]);

  const toggleTimer = () => {
    const nextState = !isActive;
    setIsActive(nextState);
    if (nextState) {
      if (rainVol > 0) {
        ambientSynth.start('rain', rainVol);
      }
    } else {
      ambientSynth.stop();
    }
  };

  const resetTimer = (newMode: 'work' | 'shortBreak' | 'longBreak' = 'work') => {
    setIsActive(false);
    ambientSynth.stop();
    setMode(newMode);
    setMinutes(newMode === 'work' ? 25 : newMode === 'shortBreak' ? 5 : 15);
    setSeconds(0);
  };

  const handleRainChange = (val: number) => {
    setRainVol(val);
    if (val > 0) {
      ambientSynth.start('rain', val);
    } else if (ambientSynth.getCurrentType() === 'rain') {
      ambientSynth.stop();
    }
  };

  const handleWavesChange = (val: number) => {
    setWavesVol(val);
    if (val > 0) {
      ambientSynth.start('ocean', val);
    } else if (ambientSynth.getCurrentType() === 'ocean') {
      ambientSynth.stop();
    }
  };

  const handleCampfireChange = (val: number) => {
    setCampfireVol(val);
    if (val > 0) {
      ambientSynth.start('campfire', val);
    } else if (ambientSynth.getCurrentType() === 'campfire') {
      ambientSynth.stop();
    }
  };

  const quotes = [
    'Tập trung sâu là siêu năng lực của kỷ nguyên số.',
    'Chất lượng công việc = Thời gian dành ra × Cường độ tập trung.',
    'Loại bỏ phân tâm là bước đầu tiên để kiến tạo điều phi thường.',
    'Sự tĩnh lặng nội tâm dẫn lối cho những quyết định sáng suốt.',
  ];

  return (
    <div className={`flex flex-col h-full bg-stone-950 text-stone-200 transition-all ${
      isZenMode ? 'fixed inset-0 z-[150] bg-black' : ''
    }`}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-900/60">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Focus Studio & Pomodoro 2.0</h1>
            <p className="text-xs text-stone-400">Không gian tập trung sâu với âm thanh thư giãn và chế độ Zen</p>
          </div>
        </div>

        <button
          onClick={() => setIsZenMode(!isZenMode)}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold transition"
        >
          {isZenMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          <span>{isZenMode ? 'Thoát Zen' : 'Chế độ Zen Toàn màn hình'}</span>
        </button>
      </div>

      {/* Main Stage */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 overflow-y-auto">
        {/* Mode Selector */}
        <div className="flex items-center p-1 rounded-2xl bg-stone-900 border border-stone-800 space-x-1">
          <button
            onClick={() => resetTimer('work')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              mode === 'work' ? 'bg-emerald-500 text-stone-950' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Làm việc sâu (25m)
          </button>
          <button
            onClick={() => resetTimer('shortBreak')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              mode === 'shortBreak' ? 'bg-emerald-500 text-stone-950' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Nghỉ ngắn (5m)
          </button>
          <button
            onClick={() => resetTimer('longBreak')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              mode === 'longBreak' ? 'bg-emerald-500 text-stone-950' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Nghỉ dài (15m)
          </button>
        </div>

        {/* Big Digital Clock Display */}
        <div className="text-center space-y-2">
          <div className="text-7xl md:text-8xl font-black font-mono tracking-tight text-white drop-shadow-2xl">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
          <p className="text-xs text-stone-400 italic max-w-md mx-auto">
            &quot;{quotes[sessionCount % quotes.length]}&quot;
          </p>
        </div>

        {/* Goal input */}
        <div className="w-full max-w-md">
          <input
            type="text"
            maxLength={500}
            value={sessionGoal}
            onChange={(e) => setSessionGoal(e.target.value)}
            placeholder="Mục tiêu của phiên làm việc này..."
            className="w-full text-center px-4 py-2 rounded-2xl bg-stone-900/60 border border-stone-800 text-xs text-stone-300 focus:outline-none focus:border-emerald-500"
          />
          {preferencesWarning && <p role="status" className="mt-2 text-center text-[10px] text-amber-300">{preferencesWarning}</p>}
          {!preferencesWarning && <p className="mt-2 text-center text-[10px] text-stone-500">Mục tiêu, âm lượng và thời gian còn lại được tự lưu cục bộ. Khi mở lại, bộ đếm tạm dừng và âm thanh không tự phát.</p>}
        </div>

        {/* Control Buttons */}
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleTimer}
            className={`px-8 py-3.5 rounded-2xl font-bold text-sm flex items-center space-x-2 shadow-2xl transition ${
              isActive
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
            }`}
          >
            {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isActive ? 'Tạm Dừng' : 'Bắt Đầu Tập Trung'}</span>
          </button>
          <button
            onClick={() => resetTimer(mode)}
            className="p-3.5 rounded-2xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-400 hover:text-stone-200 transition"
            title="Đặt lại"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Ambient Sound Lab Quick Mixer */}
        <div className="w-full max-w-lg p-5 rounded-3xl bg-stone-900/80 border border-stone-800 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-stone-300">
            <span className="flex items-center"><Volume2 className="w-4 h-4 mr-1.5 text-emerald-400" /> Âm thanh Nền Hỗ trợ Tập trung</span>
            <span className="text-[10px] text-stone-500 font-mono">Đã xong {sessionCount} phiên Pomodoro</span>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-1">
            <div className="space-y-1">
              <span className="text-[11px] text-stone-400">Mưa rào</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={rainVol}
                onChange={(e) => handleRainChange(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] text-stone-400">Sóng biển</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={wavesVol}
                onChange={(e) => handleWavesChange(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] text-stone-400">Lửa trại</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={campfireVol}
                onChange={(e) => handleCampfireChange(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
