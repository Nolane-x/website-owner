import { normalizePublicHttpsUrl } from './radio-browser';

/**
 * A page-lifetime radio player.
 *
 * The HTMLAudioElement intentionally lives outside the React component tree:
 * closing/unmounting the Audio Lab window removes only its controls, not the
 * live stream. No stream bytes are fetched into the app or stored locally.
 */

export type RadioPlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export interface RadioPlayerSnapshot {
  sourceUrl: string | null;
  stationName: string | null;
  status: RadioPlayerStatus;
  volume: number;
  error: string | null;
}

export interface RadioStation {
  id: string;
  name: string;
  description: string;
  url: string;
  homepage: string;
}

export const RADIO_STATIONS: RadioStation[] = [
  {
    id: 'anti-radio',
    name: 'Anti Radio',
    description: 'Electronic, house và nhiều thể loại · MP3',
    url: 'https://stream.antiradio.net/listen/anti_radio/mp3',
    homepage: 'https://antiradio.net/stream/',
  },
  {
    id: 'relaxing-jazz-320',
    name: 'Relaxing Jazz · HQ',
    description: 'Smooth jazz · MP3 320 kbps',
    url: 'https://443-1.autopo.st/171/stream/3/',
    homepage: 'https://relaxingjazz.com/listen/',
  },
  {
    id: 'relaxing-jazz-128',
    name: 'Relaxing Jazz · Everyday',
    description: 'Smooth jazz · MP3 128 kbps',
    url: 'https://443-1.autopo.st/171/stream/1/',
    homepage: 'https://relaxingjazz.com/listen/',
  },
  {
    id: 'relaxing-jazz-32',
    name: 'Relaxing Jazz · Data Saver',
    description: 'Smooth jazz · MP3 32 kbps, mono',
    url: 'https://443-1.autopo.st/171/stream/2/',
    homepage: 'https://relaxingjazz.com/listen/',
  },
];

export const DEFAULT_RADIO_STATION = RADIO_STATIONS[0];

const listeners = new Set<() => void>();

// Immutable snapshots keep useSyncExternalStore subscriptions stable and avoid
// effects calling setState synchronously during Audio Lab mount.
let snapshot: Readonly<RadioPlayerSnapshot> = Object.freeze({
  sourceUrl: null,
  stationName: null,
  status: 'idle',
  volume: 0.6,
  error: null,
});

let audioElement: HTMLAudioElement | null = null;
let playbackRequested = false;
let playGeneration = 0;

function emit(): void {
  for (const listener of listeners) listener();
}

function update(patch: Partial<RadioPlayerSnapshot>): void {
  snapshot = Object.freeze({ ...snapshot, ...patch });
  emit();
}

/**
 * Only HTTPS stream endpoints are accepted. An HTTPS website cannot safely
 * embed an HTTP stream because browsers block active mixed content.
 */
export function normalizeRadioStreamUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2_048) {
    throw new Error('Hãy nhập một URL luồng âm thanh HTTPS hợp lệ.');
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('URL không hợp lệ. Hãy dán địa chỉ luồng âm thanh trực tiếp.');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Chỉ hỗ trợ luồng HTTPS để trình duyệt không chặn nội dung hỗn hợp.');
  }

  const safeUrl = normalizePublicHttpsUrl(trimmed);
  if (!safeUrl) {
    throw new Error('URL luồng không hợp lệ hoặc trỏ tới địa chỉ mạng riêng.');
  }
  return safeUrl;
}

function mediaErrorMessage(audio: HTMLAudioElement): string {
  switch (audio.error?.code) {
    case 1:
      return 'Luồng đã bị hủy. Hãy bấm phát lại.';
    case 2:
      return 'Không kết nối được máy chủ radio. Hãy thử đài khác hoặc kiểm tra mạng.';
    case 3:
      return 'Trình duyệt không giải mã được âm thanh từ nguồn này. Hãy chọn luồng MP3, AAC hoặc Ogg.';
    case 4:
      return 'Nguồn không cung cấp định dạng âm thanh trình duyệt hỗ trợ. Hãy dùng URL stream MP3/AAC/Ogg trực tiếp, không phải trang web hoặc file playlist.';
    default:
      return 'Nguồn radio không phát được. Hãy thử một luồng HTTPS khác.';
  }
}

function getAudioElement(): HTMLAudioElement {
  if (audioElement) return audioElement;
  if (typeof window === 'undefined' || typeof Audio === 'undefined') {
    throw new Error('Trình duyệt này không hỗ trợ phát âm thanh HTML5.');
  }

  // Do not set crossOrigin: ordinary audio playback does not need CORS
  // permission unless JavaScript attempts to read/process the remote media.
  // Keeping this element detached and module-owned lets playback outlive a
  // React window without forcing audio into its document or component tree.
  const audio = new Audio();
  audio.preload = 'none';
  audio.volume = snapshot.volume;
  audio.addEventListener('playing', () => {
    if (playbackRequested) update({ status: 'playing', error: null });
    else audio.pause();
  });
  audio.addEventListener('waiting', () => {
    if (playbackRequested && !audio.paused) update({ status: 'loading' });
  });
  audio.addEventListener('stalled', () => {
    if (playbackRequested && !audio.paused) update({ status: 'loading' });
  });
  audio.addEventListener('pause', () => {
    if (!playbackRequested && snapshot.status !== 'error' && snapshot.status !== 'idle') {
      update({ status: 'paused' });
    }
  });
  audio.addEventListener('ended', () => {
    playbackRequested = false;
    update({ status: 'paused' });
  });
  audio.addEventListener('error', () => {
    if (!playbackRequested) return;
    playbackRequested = false;
    playGeneration += 1;
    update({ status: 'error', error: mediaErrorMessage(audio) });
  });

  audioElement = audio;
  return audio;
}

export function getRadioPlayerSnapshot(): Readonly<RadioPlayerSnapshot> {
  return snapshot;
}

export function subscribeRadioPlayer(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    // Unsubscribing a window's UI must never stop the page-lifetime player.
    listeners.delete(listener);
  };
}

export function setRadioPlayerVolume(value: number): void {
  const volume = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : snapshot.volume;
  if (audioElement) audioElement.volume = volume;
  update({ volume });
}

export async function playRadioStream(sourceUrl: string, stationName: string): Promise<void> {
  const safeUrl = normalizeRadioStreamUrl(sourceUrl);
  const audio = getAudioElement();
  const generation = ++playGeneration;
  const alreadySelected = snapshot.sourceUrl === safeUrl && audio.src === safeUrl;

  if (!alreadySelected) {
    playbackRequested = false;
    if (!audio.paused) audio.pause();
    audio.src = safeUrl;
    audio.load();
  }

  audio.volume = snapshot.volume;
  playbackRequested = true;
  update({
    sourceUrl: safeUrl,
    stationName: stationName.trim().slice(0, 80) || 'Luồng radio bên ngoài',
    status: 'loading',
    error: null,
  });

  try {
    await audio.play();
    if (generation !== playGeneration) {
      // A user may pause while play() is still pending. Do not let that
      // stale promise resurrect playback after the pause action.
      if (!playbackRequested && !audio.paused) audio.pause();
      return;
    }
    if (!audio.paused) update({ status: 'playing', error: null });
  } catch (error) {
    if (generation !== playGeneration) return;
    playbackRequested = false;
    const blocked = error instanceof Error && error.name === 'NotAllowedError';
    update({
      status: 'error',
      error: blocked
        ? 'Trình duyệt chưa cho phép phát. Hãy bấm nút Phát trực tiếp trong Audio Lab.'
        : 'Không thể bắt đầu luồng này. Hãy thử URL HTTPS của một đài khác.',
    });
  }
}

export function pauseRadioStream(): void {
  playGeneration += 1;
  playbackRequested = false;
  if (audioElement && !audioElement.paused) audioElement.pause();
  update({ status: 'paused', error: null });
}
