'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  Play,
  Pause,
  Volume2,
  VolumeX,
  CloudRain,
  Waves,
  Flame,
  Wind,
  Disc,
} from 'lucide-react';
import { ambientSynth, AmbientSoundType } from '@/lib/audio/ambient-synth';

interface AmbientTrack {
  id: AmbientSoundType;
  title: string;
  icon: React.ReactNode;
}

const TRACKS: AmbientTrack[] = [
  { id: 'rain', title: 'Mưa rào nhẹ', icon: <CloudRain className="w-4 h-4 text-sky-400" /> },
  { id: 'ocean', title: 'Sóng biển đại dương', icon: <Waves className="w-4 h-4 text-teal-400" /> },
  { id: 'campfire', title: 'Lửa trại ấm cúng', icon: <Flame className="w-4 h-4 text-amber-400" /> },
  { id: 'binaural', title: 'Sóng não Alpha 14Hz', icon: <Radio className="w-4 h-4 text-purple-400" /> },
  { id: 'whitenoise', title: 'Tiếng ồn trắng White Noise', icon: <Wind className="w-4 h-4 text-stone-400" /> },
];

export function MusicApp() {
  const [activeSound, setActiveSound] = useState<AmbientSoundType | null>(null);
  const [ambientVolume, setAmbientVolume] = useState<number>(0.5);

  // Lo-Fi radio stream
  const [isRadioPlaying, setIsRadioPlaying] = useState(false);
  const [radioVolume, setRadioVolume] = useState(0.6);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Audio visualizer bars
  const [bars, setBars] = useState<number[]>([30, 60, 45, 80, 50, 70, 40, 90, 65, 35, 55, 75]);

  useEffect(() => {
    let animId: number;
    if (activeSound || isRadioPlaying) {
      const animate = () => {
        setBars((prev) =>
          prev.map(() => Math.floor(20 + Math.random() * 75))
        );
        animId = requestAnimationFrame(animate);
      };
      animId = requestAnimationFrame(animate);
    } else {
      setBars([15, 20, 15, 25, 20, 15, 20, 25, 15, 20, 15, 20]);
    }
    return () => cancelAnimationFrame(animId);
  }, [activeSound, isRadioPlaying]);

  const toggleSound = (type: AmbientSoundType) => {
    if (activeSound === type) {
      ambientSynth.stop();
      setActiveSound(null);
    } else {
      ambientSynth.start(type, ambientVolume);
      setActiveSound(type);
    }
  };

  const handleAmbientVolumeChange = (vol: number) => {
    setAmbientVolume(vol);
    ambientSynth.setVolume(vol);
  };

  const toggleRadio = () => {
    if (!audioRef.current) return;
    if (isRadioPlaying) {
      audioRef.current.pause();
      setIsRadioPlaying(false);
    } else {
      audioRef.current.volume = radioVolume;
      audioRef.current.play().then(() => setIsRadioPlaying(true)).catch(() => {});
    }
  };

  const handleRadioVolumeChange = (vol: number) => {
    setRadioVolume(vol);
    if (audioRef.current) audioRef.current.volume = vol;
  };

  return (
    <div className="flex flex-col h-full bg-stone-950 text-stone-200 text-xs p-4 overflow-y-auto space-y-5">
      {/* Hidden audio element for Lo-Fi stream */}
      <audio
        ref={audioRef}
        src="https://streams.ilovemusic.de/iloveradio17.mp3"
        preload="none"
        onEnded={() => setIsRadioPlaying(false)}
      />

      {/* Visualizer header */}
      <div className="p-4 rounded-2xl bg-stone-900/80 border border-stone-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`p-3 rounded-2xl bg-stone-800 text-emerald-400 border border-stone-700 ${
              isRadioPlaying || activeSound ? 'animate-spin' : ''
            }`}
            style={{ animationDuration: '6s' }}
          >
            <Disc className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-stone-100 text-sm">Phòng Thẩm Âm & Lo-Fi Radio</h3>
            <p className="text-stone-400 text-[11px] mt-0.5">
              {isRadioPlaying
                ? 'Đang phát: 24/7 Lo-Fi Chillhop Radio'
                : activeSound
                ? `Đang phát âm nền: ${TRACKS.find((t) => t.id === activeSound)?.title}`
                : 'Chọn một giai điệu tập trung hoặc bật đài Lo-Fi'}
            </p>
          </div>
        </div>

        {/* Live Audio Frequency Spectrum */}
        <div className="flex items-end gap-1 h-8">
          {bars.map((height, idx) => (
            <span
              key={idx}
              style={{ height: `${height}%` }}
              className={`w-1 rounded-full transition-all duration-75 ${
                isRadioPlaying || activeSound ? 'bg-emerald-400' : 'bg-stone-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* 24/7 Lo-Fi Radio Stream Card */}
      <div className="p-3.5 rounded-xl bg-stone-900/60 border border-stone-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleRadio}
            className={`p-3 rounded-xl transition ${
              isRadioPlaying
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isRadioPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <div>
            <span className="font-bold text-stone-200">Đài phát thanh Lo-Fi 24/7</span>
            <span className="block text-stone-400 text-[11px]">Âm thanh không lời tăng sự tập trung</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {radioVolume === 0 ? <VolumeX className="w-4 h-4 text-stone-500" /> : <Volume2 className="w-4 h-4 text-stone-400" />}
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={radioVolume}
            onChange={(e) => handleRadioVolumeChange(Number(e.target.value))}
            className="w-24 accent-emerald-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Ambient Soundscapes Multi-Track Mixer */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-stone-300">Bộ trộn âm thanh tự nhiên (Procedural Synth)</span>
          <div className="flex items-center gap-2 text-stone-400">
            <span>Âm lượng tổng:</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={ambientVolume}
              onChange={(e) => handleAmbientVolumeChange(Number(e.target.value))}
              className="w-20 accent-emerald-500 cursor-pointer"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {TRACKS.map((t) => {
            const isActive = activeSound === t.id;
            return (
              <button
                key={t.id}
                onClick={() => toggleSound(t.id)}
                className={`p-3 rounded-xl border flex items-center justify-between transition ${
                  isActive
                    ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-300'
                    : 'bg-stone-900/50 border-stone-800 text-stone-300 hover:border-stone-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-stone-800">{t.icon}</div>
                  <div className="text-left">
                    <p className="font-semibold text-xs">{t.title}</p>
                    <span className="text-[10px] text-stone-500">
                      {isActive ? 'Đang phát sóng...' : 'Bấm để bật'}
                    </span>
                  </div>
                </div>

                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isActive ? 'bg-emerald-400 animate-pulse' : 'bg-stone-700'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
