'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Radio, Play, Pause, Volume2, VolumeX, CloudRain, Waves, Flame, Wind, Disc, AlertTriangle, Loader2 } from 'lucide-react';
import { AmbientMixer } from '@/lib/audio/ambient-mixer';
import type { AmbientSoundType } from '@/lib/audio/ambient-synth';

interface AmbientTrack {
  id: AmbientSoundType;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const TRACKS: AmbientTrack[] = [
  { id: 'rain', title: 'Mưa rào nhẹ', description: 'Tiếng mưa lọc tần số', icon: <CloudRain className="w-4 h-4 text-sky-400" /> },
  { id: 'ocean', title: 'Sóng biển', description: 'Nhiễu nền có nhịp sóng chậm', icon: <Waves className="w-4 h-4 text-teal-400" /> },
  { id: 'campfire', title: 'Lửa trại', description: 'Nhiễu trầm ấm', icon: <Flame className="w-4 h-4 text-amber-400" /> },
  { id: 'binaural', title: 'Sóng lệch 14 Hz', description: 'Âm trái 216 Hz, phải 230 Hz', icon: <Radio className="w-4 h-4 text-purple-400" /> },
  { id: 'whitenoise', title: 'White noise', description: 'Nhiễu trắng liên tục', icon: <Wind className="w-4 h-4 text-stone-400" /> },
];

const DEFAULT_VOLUMES: Record<AmbientSoundType, number> = {
  rain: 0.42, ocean: 0.4, campfire: 0.35, binaural: 0.15, whitenoise: 0.2,
};

export function MusicApp() {
  const [mixer] = useState(() => new AmbientMixer());
  const [activeLayers, setActiveLayers] = useState<AmbientSoundType[]>([]);
  const [volumes, setVolumes] = useState<Record<AmbientSoundType, number>>(DEFAULT_VOLUMES);
  const [masterVolume, setMasterVolume] = useState(0.5);
  const [bars, setBars] = useState<number[]>(Array.from({ length: 12 }, () => 3));
  const [audioSupported, setAudioSupported] = useState(true);

  const [isRadioPlaying, setIsRadioPlaying] = useState(false);
  const [isRadioLoading, setIsRadioLoading] = useState(false);
  const [radioVolume, setRadioVolume] = useState(0.6);
  const [radioError, setRadioError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeSet = useMemo(() => new Set(activeLayers), [activeLayers]);

  useEffect(() => {
    const audioElement = audioRef.current;
    return () => {
      mixer.stopAll();
      if (audioElement) audioElement.pause();
    };
  }, [mixer]);

  useEffect(() => {
    if (activeLayers.length === 0) return;
    const interval = window.setInterval(() => setBars(mixer.getFrequencyLevels(12)), 100);
    return () => window.clearInterval(interval);
  }, [activeLayers.length, mixer]);
  const displayedBars = activeLayers.length ? bars : Array.from({ length: 12 }, () => 3);

  const toggleSound = (type: AmbientSoundType) => {
    setRadioError(null);
    if (activeSet.has(type)) {
      mixer.stopLayer(type);
      setActiveLayers((previous) => previous.filter((active) => active !== type));
      return;
    }
    const started = mixer.startLayer(type, volumes[type]);
    if (!started) {
      setAudioSupported(false);
      setRadioError('Trình duyệt không hỗ trợ Web Audio hoặc không thể khởi tạo âm thanh. Hãy thử Chrome/Edge.');
      return;
    }
    mixer.setMasterVolume(masterVolume);
    setActiveLayers((previous) => previous.includes(type) ? previous : [...previous, type]);
  };

  const handleTrackVolumeChange = (type: AmbientSoundType, volume: number) => {
    setVolumes((previous) => ({ ...previous, [type]: volume }));
    mixer.setLayerVolume(type, volume);
  };

  const handleMasterVolumeChange = (volume: number) => {
    setMasterVolume(volume);
    mixer.setMasterVolume(volume);
  };

  const toggleRadio = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    setRadioError(null);
    if (isRadioPlaying || isRadioLoading) {
      audio.pause();
      setIsRadioPlaying(false);
      setIsRadioLoading(false);
      return;
    }
    setIsRadioLoading(true);
    audio.volume = radioVolume;
    try {
      await audio.play();
      setIsRadioPlaying(true);
    } catch {
      setIsRadioPlaying(false);
      setRadioError('Không phát được luồng radio từ nguồn bên ngoài. Có thể do nguồn ngừng hoạt động, CORS/chính sách mạng hoặc codec.');
    } finally {
      setIsRadioLoading(false);
    }
  };

  const handleRadioVolumeChange = (volume: number) => {
    const safeVolume = Math.max(0, Math.min(1, volume));
    setRadioVolume(safeVolume);
    if (audioRef.current) audioRef.current.volume = safeVolume;
  };

  return (
    <div className="flex flex-col h-full bg-stone-950 text-stone-200 text-xs p-4 overflow-y-auto space-y-5">
      <audio
        ref={audioRef}
        src="https://streams.ilovemusic.de/iloveradio17.mp3"
        preload="none"
        onPlaying={() => { setIsRadioPlaying(true); setIsRadioLoading(false); setRadioError(null); }}
        onPause={() => setIsRadioPlaying(false)}
        onEnded={() => setIsRadioPlaying(false)}
        onError={() => {
          setIsRadioPlaying(false);
          setIsRadioLoading(false);
          setRadioError('Nguồn radio bên ngoài hiện không tải được. Đây là dịch vụ bên thứ ba, không được bảo đảm uptime hoặc giấy phép phát sóng bởi Personal Web OS.');
        }}
      />

      <div className="p-4 rounded-2xl bg-stone-900/80 border border-stone-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={isRadioPlaying || activeLayers.length ? 'p-3 rounded-2xl bg-stone-800 text-emerald-400 border border-stone-700 animate-spin' : 'p-3 rounded-2xl bg-stone-800 text-emerald-400 border border-stone-700'} style={{ animationDuration: '6s' }}>
            <Disc className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-stone-100 text-sm">Audio Lab & Ambient Mixer</h3>
            <p className="text-stone-400 text-[11px] mt-0.5">
              {isRadioPlaying ? 'Radio bên ngoài đang phát' : activeLayers.length ? activeLayers.length + ' lớp âm thanh tổng hợp đang chạy' : 'Chưa có âm thanh tổng hợp nào đang chạy'}
            </p>
          </div>
        </div>
        <div className="flex items-end gap-1 h-9 shrink-0" role="img" aria-label="Phổ tần số âm thanh thực tế từ AnalyserNode Web Audio">
          {displayedBars.map((height, index) => (
            <span key={index} style={{ height: String(Math.max(3, height)) + '%' }} className={activeLayers.length ? 'w-1.5 rounded-full transition-[height] duration-100 bg-emerald-400' : 'w-1.5 rounded-full transition-[height] duration-100 bg-stone-700'} />
          ))}
        </div>
      </div>

      {radioError && <div role="alert" className="p-3 rounded-xl border border-amber-800 bg-amber-950/30 text-amber-200 text-xs flex items-start gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{radioError}</div>}

      <div className="p-3.5 rounded-xl bg-stone-900/60 border border-stone-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <button onClick={() => void toggleRadio()} disabled={isRadioLoading} className={isRadioPlaying ? 'p-3 rounded-xl transition disabled:opacity-50 bg-rose-600 hover:bg-rose-500 text-white' : 'p-3 rounded-xl transition disabled:opacity-50 bg-emerald-600 hover:bg-emerald-500 text-white'} aria-label={isRadioPlaying ? 'Tạm dừng radio bên ngoài' : 'Phát radio bên ngoài'}>
            {isRadioLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isRadioPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <div className="min-w-0">
            <span className="font-bold text-stone-200">Luồng radio bên thứ ba</span>
            <span className="block text-stone-400 text-[11px]">Cần kết nối mạng; khả dụng phụ thuộc nguồn stream</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {radioVolume === 0 ? <VolumeX className="w-4 h-4 text-stone-500" /> : <Volume2 className="w-4 h-4 text-stone-400" />}
          <input type="range" min={0} max={1} step={0.05} value={radioVolume} onChange={(event) => handleRadioVolumeChange(Number(event.target.value))} aria-label="Âm lượng radio" className="w-24 accent-emerald-500 cursor-pointer" />
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="font-semibold text-stone-200">Bộ trộn nhiều lớp tổng hợp</h4>
            <p className="text-[11px] text-stone-500 mt-1">Mỗi lớp có gain độc lập; nhiều lớp có thể phát đồng thời. Phổ tần số đọc từ AnalyserNode thật.</p>
          </div>
          <div className="flex items-center gap-2 text-stone-400">
            <span>Master</span>
            <input type="range" min={0} max={1} step={0.05} value={masterVolume} onChange={(event) => handleMasterVolumeChange(Number(event.target.value))} aria-label="Âm lượng tổng" className="w-24 accent-emerald-500 cursor-pointer" />
          </div>
        </div>

        {!audioSupported && <p className="p-3 border border-amber-800 rounded-xl bg-amber-950/20 text-amber-200">Web Audio API không khả dụng trong trình duyệt này.</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TRACKS.map((track) => {
            const active = activeSet.has(track.id);
            return (
              <div key={track.id} className={active ? 'p-3 rounded-xl border transition bg-emerald-950/35 border-emerald-700/60' : 'p-3 rounded-xl border transition bg-stone-900/50 border-stone-800'}>
                <div className="flex items-center justify-between gap-3">
                  <button onClick={() => toggleSound(track.id)} className="flex items-center gap-2.5 text-left min-w-0" aria-pressed={active}>
                    <div className="p-2 rounded-lg bg-stone-800">{track.icon}</div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-stone-100">{track.title}</p>
                      <span className="text-[10px] text-stone-500">{track.description}</span>
                    </div>
                  </button>
                  <button onClick={() => toggleSound(track.id)} className={active ? 'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-emerald-600 text-white' : 'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-stone-800 text-stone-400 hover:text-white'} aria-label={(active ? 'Tắt ' : 'Bật ') + track.title}>
                    {active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Volume2 className="w-3.5 h-3.5 text-stone-500" />
                  <input type="range" min={0} max={1} step={0.05} value={volumes[track.id]} onChange={(event) => handleTrackVolumeChange(track.id, Number(event.target.value))} aria-label={'Âm lượng ' + track.title} className="flex-1 accent-emerald-500 cursor-pointer" />
                  <span className="w-8 text-right text-[10px] text-stone-500">{Math.round(volumes[track.id] * 100)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <p className="text-[10px] leading-relaxed text-stone-600">Âm thanh tổng hợp được tạo cục bộ bằng Web Audio API. Luồng radio là dịch vụ bên thứ ba; Personal Web OS không bảo đảm nội dung, bản quyền hoặc thời gian hoạt động của nguồn này.</p>
    </div>
  );
}
