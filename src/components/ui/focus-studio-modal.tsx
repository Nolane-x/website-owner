'use client';

import React, { useState, useEffect } from 'react';
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  CloudRain,
  Waves,
  Flame,
  Radio,
  Wind,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ambientSynth, AmbientSoundType } from '@/lib/audio/ambient-synth';
import { playSound } from '@/lib/audio/sound-fx';

type PomodoroMode = 'focus' | 'short_break' | 'long_break';

const MODE_CONFIG: Record<PomodoroMode, { label: string; durationMinutes: number; color: string }> = {
  focus: { label: 'Tập trung sâu', durationMinutes: 25, color: 'text-amber-500' },
  short_break: { label: 'Nghỉ ngắn', durationMinutes: 5, color: 'text-emerald-500' },
  long_break: { label: 'Nghỉ dài', durationMinutes: 15, color: 'text-blue-500' },
};

const AMBIENT_TRACKS: { id: AmbientSoundType; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: 'rain', label: 'Mưa rơi', icon: CloudRain },
  { id: 'ocean', label: 'Sóng biển', icon: Waves },
  { id: 'campfire', label: 'Lửa trại', icon: Flame },
  { id: 'binaural', label: 'Sóng não Alpha (14Hz)', icon: Radio },
  { id: 'whitenoise', label: 'Tiếng ồn trắng', icon: Wind },
];

export function FocusStudioModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<PomodoroMode>('focus');
  const [secondsLeft, setSecondsLeft] = useState(MODE_CONFIG['focus'].durationMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [activeAmbient, setActiveAmbient] = useState<AmbientSoundType | null>(null);
  const [volume, setVolume] = useState(0.5);

  // Timer loop
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsRunning(false);
          playSound('chime');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  const handleModeChange = (newMode: PomodoroMode) => {
    setMode(newMode);
    setIsRunning(false);
    setSecondsLeft(MODE_CONFIG[newMode].durationMinutes * 60);
    playSound('pop');
  };

  const toggleTimer = () => {
    playSound('pop');
    setIsRunning((prev) => !prev);
  };

  const resetTimer = () => {
    playSound('thock');
    setIsRunning(false);
    setSecondsLeft(MODE_CONFIG[mode].durationMinutes * 60);
  };

  const handleAmbientToggle = (ambientId: AmbientSoundType) => {
    if (activeAmbient === ambientId) {
      ambientSynth.stop();
      setActiveAmbient(null);
      playSound('pop');
    } else {
      ambientSynth.start(ambientId, volume);
      setActiveAmbient(ambientId);
      playSound('snap');
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    ambientSynth.setVolume(val);
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent =
    ((MODE_CONFIG[mode].durationMinutes * 60 - secondsLeft) /
      (MODE_CONFIG[mode].durationMinutes * 60)) *
    100;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-surface-subtle)]">
          <div className="flex items-center gap-2">
            <Timer className="text-[var(--accent)]" size={18} />
            <span className="font-semibold text-sm text-[var(--text-primary)]">
              Focus Studio & Không gian tập trung
            </span>
          </div>
          <button
            onClick={() => {
              ambientSynth.stop();
              setActiveAmbient(null);
              onClose();
            }}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Mode Tabs */}
          <div className="flex rounded-xl bg-[var(--bg-surface-subtle)] p-1 border border-[var(--border-color)]">
            {(Object.keys(MODE_CONFIG) as PomodoroMode[]).map((m) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  mode === m
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {MODE_CONFIG[m].label}
              </button>
            ))}
          </div>

          {/* Circular / Large Timer Display */}
          <div className="flex flex-col items-center justify-center py-4 relative">
            <div className="text-6xl font-bold font-mono tracking-tight text-[var(--text-primary)]">
              {formatTime(secondsLeft)}
            </div>
            <span className={`text-xs font-semibold mt-2 uppercase tracking-wider ${MODE_CONFIG[mode].color}`}>
              {isRunning ? 'Đang đếm thời gian' : 'Tạm dừng'}
            </span>

            {/* Progress bar */}
            <div className="w-48 h-1.5 bg-[var(--border-color)] rounded-full mt-4 overflow-hidden">
              <div
                className="h-full bg-[var(--accent)] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Timer Controls */}
          <div className="flex items-center justify-center gap-4">
            <Button
              onClick={toggleTimer}
              size="lg"
              className="w-32 rounded-xl flex items-center justify-center gap-2"
            >
              {isRunning ? <Pause size={18} /> : <Play size={18} />}
              {isRunning ? 'Tạm dừng' : 'Bắt đầu'}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={resetTimer}
              className="rounded-xl px-3"
              title="Đặt lại"
            >
              <RotateCcw size={18} />
            </Button>
          </div>

          {/* Ambient Soundscape Synthesizer Controls */}
          <div className="pt-4 border-t border-[var(--border-color)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                Âm thanh tập trung vô cực (Synthesizer)
              </span>
              {activeAmbient && (
                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <CheckCircle2 size={10} /> Đang phát
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AMBIENT_TRACKS.map((t) => {
                const Icon = t.icon;
                const isSelected = activeAmbient === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleAmbientToggle(t.id)}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                      isSelected
                        ? 'bg-[var(--accent)]/15 border-[var(--accent)] text-[var(--accent)]'
                        : 'bg-[var(--bg-surface-subtle)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
                    }`}
                  >
                    <Icon size={16} />
                    <span className="text-xs font-medium truncate">{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Volume slider */}
            {activeAmbient && (
              <div className="flex items-center gap-3 pt-2">
                {volume === 0 ? (
                  <VolumeX size={16} className="text-[var(--text-muted)] shrink-0" />
                ) : (
                  <Volume2 size={16} className="text-[var(--accent)] shrink-0" />
                )}
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-full accent-[var(--accent)] cursor-pointer"
                />
                <span className="text-xs font-mono text-[var(--text-muted)] w-8 text-right">
                  {Math.round(volume * 100)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
