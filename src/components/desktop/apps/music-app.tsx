'use client';

import React, { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Radio, Play, Pause, Volume2, VolumeX, CloudRain, Waves, Flame, Wind, Disc, AlertTriangle, Loader2 } from 'lucide-react';
import { ambientMixer } from '@/lib/audio/ambient-mixer';
import type { AmbientSoundType } from '@/lib/audio/ambient-synth';
import { loadMusicPreferences, saveMusicPreferences } from '@/lib/audio/audio-preferences';
import {
  getRadioPlayerSnapshot,
  normalizeRadioStreamUrl,
  pauseRadioStream,
  playRadioStream,
  RADIO_STATIONS,
  setRadioPlayerVolume,
  subscribeRadioPlayer,
} from '@/lib/audio/radio-player';
import { PREFERENCE_PERSISTENCE_EVENT, reportPreferencePersistence, type PreferencePersistenceResult } from '@/lib/persistence-events';
import { RadioBrowserPanel } from './radio-browser-panel';
import type { RadioBrowserStation } from '@/lib/audio/radio-browser';

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

export function MusicApp() {
  const [initialPreferences] = useState(() => loadMusicPreferences());
  // Keep one shared mixer for the lifetime of the page, not one per window.
  const [mixer] = useState(() => ambientMixer);
  const [activeLayers, setActiveLayers] = useState<AmbientSoundType[]>(() => mixer.getActiveLayers());
  const [volumes, setVolumes] = useState<Record<AmbientSoundType, number>>(initialPreferences.volumes);
  const [masterVolume, setMasterVolume] = useState(initialPreferences.masterVolume);
  const [bars, setBars] = useState<number[]>(Array.from({ length: 12 }, () => 3));
  const [audioSupported, setAudioSupported] = useState(true);
  const [preferencesWarning, setPreferencesWarning] = useState<string | null>(null);

  const radioState = useSyncExternalStore(subscribeRadioPlayer, getRadioPlayerSnapshot, getRadioPlayerSnapshot);
  const [radioVolume, setRadioVolume] = useState(initialPreferences.radioVolume);
  const [radioSourceUrl, setRadioSourceUrl] = useState(initialPreferences.radioSourceUrl);
  const [radioStationName, setRadioStationName] = useState(initialPreferences.radioStationName);
  const [customRadioUrl, setCustomRadioUrl] = useState(() =>
    RADIO_STATIONS.some((station) => station.url === initialPreferences.radioSourceUrl)
      ? ''
      : initialPreferences.radioSourceUrl,
  );
  const [sourceError, setSourceError] = useState<string | null>(null);

  const activeSet = useMemo(() => new Set(activeLayers), [activeLayers]);
  const isRadioPlaying = radioState.status === 'playing';
  const isRadioLoading = radioState.status === 'loading';

  useEffect(() => {
    const handlePersistence = (event: Event) => {
      const detail = (event as CustomEvent<PreferencePersistenceResult>).detail;
      if (detail?.scope === 'audio-lab') setPreferencesWarning(detail.message);
    };
    window.addEventListener(PREFERENCE_PERSISTENCE_EVENT, handlePersistence);
    return () => window.removeEventListener(PREFERENCE_PERSISTENCE_EVENT, handlePersistence);
  }, []);

  useEffect(() => {
    const saved = saveMusicPreferences({
      volumes,
      masterVolume,
      radioVolume,
      radioSourceUrl,
      radioStationName,
    });
    reportPreferencePersistence('audio-lab', saved ? null : 'Không thể lưu âm lượng và nguồn radio vào trình duyệt này; hãy kiểm tra quyền lưu dữ liệu website.');
  }, [volumes, masterVolume, radioVolume, radioSourceUrl, radioStationName]);

  useEffect(() => {
    setRadioPlayerVolume(radioVolume);
  }, [radioVolume]);

  useEffect(() => {
    mixer.setMasterVolume(masterVolume);
  }, [masterVolume, mixer]);

  useEffect(() => {
    if (activeLayers.length === 0) return;
    const interval = window.setInterval(() => setBars(mixer.getFrequencyLevels(12)), 100);
    return () => window.clearInterval(interval);
  }, [activeLayers.length, mixer]);

  // Deliberately no audio cleanup here. The player and ambientMixer are
  // page-lifetime singletons; unmounting this UI must not pause/stop playback.
  const displayedBars = activeLayers.length ? bars : Array.from({ length: 12 }, () => 3);

  const toggleSound = (type: AmbientSoundType) => {
    if (activeSet.has(type)) {
      mixer.stopLayer(type);
      setActiveLayers((previous) => previous.filter((active) => active !== type));
      return;
    }
    const started = mixer.startLayer(type, volumes[type]);
    if (!started) {
      setAudioSupported(false);
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
    if (radioState.status === 'playing' || radioState.status === 'loading') {
      pauseRadioStream();
      return;
    }
    setSourceError(null);
    try {
      await playRadioStream(radioSourceUrl, radioStationName);
    } catch (error) {
      setSourceError(error instanceof Error ? error.message : 'URL radio không hợp lệ.');
    }
  };

  const playSelectedStation = async (url: string, name: string): Promise<boolean> => {
    setRadioSourceUrl(url);
    setRadioStationName(name);
    setCustomRadioUrl('');
    setSourceError(null);
    try {
      await playRadioStream(url, name);
      return getRadioPlayerSnapshot().status === 'playing';
    } catch (error) {
      setSourceError(error instanceof Error ? error.message : 'URL radio không hợp lệ.');
      return false;
    }
  };

  const handleCatalogStationPlay = async (station: RadioBrowserStation): Promise<boolean> => {
    const started = await playSelectedStation(station.streamUrl, station.name);
    if (started) {
      // Best-effort directory click count; the audio bytes still flow directly
      // from the station to the browser, never through this API route.
      void fetch('/api/radio-browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stationUuid: station.id }),
      }).catch(() => undefined);
    }
    return started;
  };

  const applyCustomRadioUrl = () => {
    try {
      const safeUrl = normalizeRadioStreamUrl(customRadioUrl);
      setRadioSourceUrl(safeUrl);
      setRadioStationName('Luồng tùy chỉnh');
      setSourceError(null);
    } catch (error) {
      setSourceError(error instanceof Error ? error.message : 'URL radio không hợp lệ.');
    }
  };

  const statusLabel = isRadioPlaying
    ? 'Đang phát: ' + (radioState.stationName || 'Radio bên ngoài')
    : isRadioLoading
      ? 'Đang kết nối luồng radio...'
      : radioState.status === 'paused'
        ? 'Đã tạm dừng: ' + (radioState.stationName || 'Radio bên ngoài')
        : radioState.status === 'error'
          ? 'Không phát được luồng radio'
          : activeLayers.length
            ? activeLayers.length + ' lớp âm thanh tổng hợp đang chạy'
            : 'Chưa có âm thanh nào đang chạy';

  return (
    <div className="flex flex-col h-full bg-stone-950 text-stone-200 text-xs p-4 overflow-y-auto space-y-5">
      <div className="p-4 rounded-2xl bg-stone-900/80 border border-stone-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={isRadioPlaying || activeLayers.length ? 'p-3 rounded-2xl bg-stone-800 text-emerald-400 border border-stone-700 animate-spin' : 'p-3 rounded-2xl bg-stone-800 text-emerald-400 border border-stone-700'} style={{ animationDuration: '6s' }}>
            <Disc className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-stone-100 text-sm">Audio Lab & Ambient Mixer</h3>
            <p className="text-stone-400 text-[11px] mt-0.5">{statusLabel}</p>
          </div>
        </div>
        <div className="flex items-end gap-1 h-9 shrink-0" role="img" aria-label="Phổ tần số âm thanh thực tế từ AnalyserNode Web Audio">
          {displayedBars.map((height, index) => (
            <span key={index} style={{ height: String(Math.max(3, height)) + '%' }} className={activeLayers.length ? 'w-1.5 rounded-full transition-[height] duration-100 bg-emerald-400' : 'w-1.5 rounded-full transition-[height] duration-100 bg-stone-700'} />
          ))}
        </div>
      </div>

      {(radioState.error || sourceError) && (
        <div role="alert" className="p-3 rounded-xl border border-amber-800 bg-amber-950/30 text-amber-200 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{sourceError || radioState.error}</span>
        </div>
      )}

      <section className="p-3.5 rounded-xl bg-stone-900/60 border border-stone-800 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => void toggleRadio()}
              className={isRadioPlaying ? 'p-3 rounded-xl transition bg-rose-600 hover:bg-rose-500 text-white' : 'p-3 rounded-xl transition disabled:opacity-50 bg-emerald-600 hover:bg-emerald-500 text-white'}
              aria-label={isRadioPlaying || isRadioLoading ? 'Tạm dừng radio bên ngoài' : 'Phát radio bên ngoài'}
            >
              {isRadioLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isRadioPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <div className="min-w-0">
              <span className="font-bold text-stone-200">Radio trực tuyến bên ngoài</span>
              <span className="block text-stone-400 text-[11px]">
                {radioState.stationName || radioStationName} · Phát trực tiếp từ máy chủ của đài
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {radioVolume === 0 ? <VolumeX className="w-4 h-4 text-stone-500" /> : <Volume2 className="w-4 h-4 text-stone-400" />}
            <input type="range" min={0} max={1} step={0.05} value={radioVolume} onChange={(event) => setRadioVolume(Number(event.target.value))} aria-label="Âm lượng radio" className="w-24 accent-emerald-500 cursor-pointer" />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-stone-500">Đài chọn lọc</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {RADIO_STATIONS.map((station) => {
              const active = radioState.sourceUrl === station.url;
              return (
                <button
                  key={station.id}
                  type="button"
                  onClick={() => void playSelectedStation(station.url, station.name)}
                  className={active ? 'rounded-lg border border-emerald-700 bg-emerald-950/40 px-2.5 py-2 text-left' : 'rounded-lg border border-stone-800 bg-stone-950 px-2.5 py-2 text-left hover:border-stone-600'}
                >
                  <span className="block truncate text-[11px] font-medium text-stone-200">{station.name}</span>
                  <span className="mt-0.5 block truncate text-[9px] text-stone-500">{station.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        <RadioBrowserPanel onPlayStation={handleCatalogStationPlay} currentStreamUrl={radioState.sourceUrl} />

        <div className="min-w-0">
          <label htmlFor="custom-radio-url" className="mb-1 block text-[10px] text-stone-500">Hoặc dán URL stream HTTPS trực tiếp của một đài khác</label>
          <div className="flex gap-2">
            <input
              id="custom-radio-url"
              type="url"
              inputMode="url"
              value={customRadioUrl}
              onChange={(event) => setCustomRadioUrl(event.target.value)}
              placeholder="https://…/stream.mp3"
              className="min-w-0 flex-1 rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-xs text-stone-200 outline-none placeholder:text-stone-600 focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={applyCustomRadioUrl}
              disabled={!customRadioUrl.trim()}
              className="shrink-0 rounded-lg border border-stone-700 px-3 py-2 text-xs text-stone-200 transition hover:bg-stone-800 disabled:opacity-40"
            >
              Dùng URL
            </button>
          </div>
        </div>
        <p className="text-[10px] leading-relaxed text-stone-500">
          Radio Browser là danh bạ bên ngoài; Audio Lab chỉ tra cứu metadata và phát URL HTTPS trực tiếp. Website không proxy, tải xuống hay lưu tệp âm thanh. Một số đài có thể ngừng phát hoặc đổi URL giữa các lần kiểm tra.
        </p>
        {radioState.status === 'error' && (
          <button type="button" onClick={() => void toggleRadio()} className="text-[11px] font-medium text-emerald-400 hover:text-emerald-300">
            Thử kết nối lại
          </button>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="font-semibold text-stone-200">Bộ trộn nhiều lớp tổng hợp</h4>
            <p className="text-[11px] text-stone-500 mt-1">
              Mỗi lớp có gain độc lập; nhiều lớp có thể phát đồng thời. Phổ tần số đọc từ AnalyserNode thật. Âm lượng và đài phát được lưu trên trình duyệt.
            </p>
            {preferencesWarning && <p role="status" className="mt-1 text-[10px] text-amber-300">{preferencesWarning}</p>}
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

      <p className="text-[10px] leading-relaxed text-stone-600">
        Đóng cửa sổ Audio Lab chỉ ẩn bảng điều khiển: radio và các lớp âm thanh vẫn tiếp tục phát. Mở lại Audio Lab để tạm dừng hoặc điều chỉnh âm lượng. Đóng tab hoặc tải lại toàn bộ website sẽ dừng phát.
      </p>
    </div>
  );
}
