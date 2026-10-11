'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownToLine,
  ArrowLeft,
  BookOpen,
  ExternalLink,
  Code2,
  LoaderCircle,
  Newspaper,
  ShieldCheck,
  Sparkles,
  Star,
  Clock3,
  Info,
  Trophy,
} from 'lucide-react';
import { normalizeHleLeaderboard, type HleLeaderboardEntry } from '@/lib/open-data/hle-leaderboard';
import { PublicCalculatorTools } from '@/components/public/public-calculator-tools';

type Model = { id: string; downloads?: number; likes?: number; pipeline_tag?: string; lastModified?: string };
type Repository = { full_name: string; html_url: string; description?: string | null; stargazers_count?: number; language?: string | null; updated_at?: string };
type Story = { objectID: string; title?: string; story_title?: string; url?: string | null; story_url?: string | null; points?: number; num_comments?: number; created_at?: string };
type SourceId = 'models' | 'repos' | 'news' | 'hle';
type FeedState<T> = { items: T[]; savedAt: number | null; status: string };

const CACHE_MS = 30 * 60 * 1000;
const COOLDOWN_MS = 45 * 1000;
const MAX_RESPONSE_BYTES = 180 * 1024;
const CACHE_KEYS: Record<SourceId, string> = {
  models: 'webos:public-feed:v2:models',
  repos: 'webos:public-feed:v2:repos',
  news: 'webos:public-feed:v2:news',
  hle: 'webos:public-feed:v2:hle',
};
const LAST_REQUEST_KEY = 'webos:public-feed:v2:last-request';

const benchmarks = [
  { name: 'Artificial Analysis', type: 'Hiệu năng, độ trễ & chi phí', description: 'So sánh mô hình theo các phép đo được công bố; hãy kiểm tra phiên bản và phương pháp chấm.', href: 'https://artificialanalysis.ai/models' },
  { name: 'LMArena Leaderboard', type: 'Bình chọn câu trả lời', description: 'Thứ hạng dựa trên đánh giá so sánh của người dùng; không đại diện cho mọi tác vụ.', href: 'https://lmarena.ai/leaderboard' },
  { name: 'Stanford HELM', type: 'Nghiên cứu & đánh giá', description: 'Khung đánh giá theo nhiều kịch bản, tiêu chí và phương pháp luận.', href: 'https://crfm.stanford.edu/helm/' },
  { name: 'Hugging Face Open LLM Leaderboard', type: 'Mô hình mở', description: 'Tham khảo kết quả trên benchmark được mô tả cụ thể; kiểm tra trạng thái hoạt động và ngày cập nhật.', href: 'https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard' },
];

function defaultFeed<T>(): FeedState<T> {
  return { items: [], savedAt: null, status: 'Chưa tải dữ liệu. Chỉ gọi API khi bạn chủ động bấm nút.' };
}

function formatNumber(value: number | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return '—';
  return new Intl.NumberFormat('vi-VN', { notation: value >= 100_000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value);
}

function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : null;
  } catch {
    return null;
  }
}

async function readJsonLimited<T>(response: Response): Promise<T> {
  if (!response.ok) {
    if (response.status === 429) throw new Error('Nguồn API đang giới hạn yêu cầu. Hãy đợi rồi thử lại.');
    throw new Error('Nguồn API trả về HTTP ' + response.status + '.');
  }
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('json')) throw new Error('Nguồn API không trả về JSON.');
  const declaredLength = Number(response.headers.get('content-length') || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error('Phản hồi quá lớn; đã dừng đọc dữ liệu.');
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Không thể đọc nội dung API.');
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_RESPONSE_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new Error('Phản hồi vượt giới hạn 180 KiB; đã hủy tải dữ liệu.');
      }
      chunks.push(value);
    }
  } finally {
    try { reader.releaseLock(); } catch { /* Reader may already be released. */ }
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as T;
  } catch {
    throw new Error('Phản hồi JSON/UTF-8 không hợp lệ.');
  }
}

function normalizeModels(input: unknown): Model[] {
  if (!Array.isArray(input)) throw new Error('Danh sách mô hình không đúng định dạng.');
  return input.slice(0, 8).flatMap((value): Model[] => {
    if (!value || typeof value !== 'object') return [];
    const item = value as Record<string, unknown>;
    if (typeof item.id !== 'string' || item.id.length < 1 || item.id.length > 200 || item.private === true) return [];
    return [{
      id: item.id,
      downloads: typeof item.downloads === 'number' && Number.isFinite(item.downloads) ? Math.max(0, item.downloads) : undefined,
      likes: typeof item.likes === 'number' && Number.isFinite(item.likes) ? Math.max(0, item.likes) : undefined,
      pipeline_tag: typeof item.pipeline_tag === 'string' ? item.pipeline_tag.slice(0, 80) : undefined,
      lastModified: typeof item.lastModified === 'string' ? item.lastModified.slice(0, 40) : undefined,
    }];
  });
}

function normalizeRepos(input: unknown): Repository[] {
  if (!input || typeof input !== 'object') throw new Error('Danh sách repository không đúng định dạng.');
  const items = (input as { items?: unknown }).items;
  if (!Array.isArray(items)) throw new Error('GitHub API không trả về danh sách repository.');
  return items.slice(0, 8).flatMap((value): Repository[] => {
    if (!value || typeof value !== 'object') return [];
    const item = value as Record<string, unknown>;
    const url = safeHttpUrl(typeof item.html_url === 'string' ? item.html_url : null);
    if (!url || new URL(url).hostname !== 'github.com' || typeof item.full_name !== 'string' || item.full_name.length > 180) return [];
    return [{
      full_name: item.full_name,
      html_url: url,
      description: typeof item.description === 'string' ? item.description.slice(0, 420) : null,
      stargazers_count: typeof item.stargazers_count === 'number' && Number.isFinite(item.stargazers_count) ? Math.max(0, item.stargazers_count) : undefined,
      language: typeof item.language === 'string' ? item.language.slice(0, 60) : null,
      updated_at: typeof item.updated_at === 'string' ? item.updated_at : undefined,
    }];
  });
}

function normalizeStories(input: unknown): Story[] {
  if (!input || typeof input !== 'object') throw new Error('Danh sách bài viết không đúng định dạng.');
  const hits = (input as { hits?: unknown }).hits;
  if (!Array.isArray(hits)) throw new Error('News API không trả về danh sách bài viết.');
  return hits.slice(0, 8).flatMap((value): Story[] => {
    if (!value || typeof value !== 'object') return [];
    const item = value as Record<string, unknown>;
    if (typeof item.objectID !== 'string') return [];
    const url = safeHttpUrl(typeof item.url === 'string' ? item.url : typeof item.story_url === 'string' ? item.story_url : null);
    return [{
      objectID: item.objectID.slice(0, 100),
      title: typeof item.title === 'string' ? item.title.slice(0, 300) : typeof item.story_title === 'string' ? item.story_title.slice(0, 300) : undefined,
      url: url || undefined,
      points: typeof item.points === 'number' && Number.isFinite(item.points) ? Math.max(0, item.points) : undefined,
      num_comments: typeof item.num_comments === 'number' && Number.isFinite(item.num_comments) ? Math.max(0, item.num_comments) : undefined,
      created_at: typeof item.created_at === 'string' ? item.created_at : undefined,
    }];
  }).filter((story) => Boolean(story.title));
}

export default function PublicToolsPage() {
  const [models, setModels] = useState<FeedState<Model>>(defaultFeed);
  const [repos, setRepos] = useState<FeedState<Repository>>(defaultFeed);
  const [news, setNews] = useState<FeedState<Story>>(defaultFeed);
  const [hle, setHle] = useState<FeedState<HleLeaderboardEntry>>(defaultFeed);
  const [loadingSource, setLoadingSource] = useState<SourceId | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [clockNow, setClockNow] = useState(0);
  const [storageReady, setStorageReady] = useState(false);
  const cooldownActive = cooldownUntil > clockNow;

  useEffect(() => {
    // Defer storage hydration until the browser's first animation frame so React's
    // render stays pure and cache recovery does not synchronously cascade renders.
    const frame = window.requestAnimationFrame(() => {
      const now = Date.now();
      setClockNow(now);
      for (const source of Object.keys(CACHE_KEYS) as SourceId[]) {
        try {
          const raw = window.localStorage.getItem(CACHE_KEYS[source]);
          if (!raw || raw.length > MAX_RESPONSE_BYTES * 2) continue;
          const payload = JSON.parse(raw) as { savedAt?: unknown; items?: unknown };
          if (typeof payload.savedAt !== 'number' || !Number.isFinite(payload.savedAt) || payload.savedAt > now || !Array.isArray(payload.items) || payload.items.length > 8) continue;
          if (now - payload.savedAt > CACHE_MS) continue;
          const savedAt = payload.savedAt;
          if (source === 'models') setModels({ items: normalizeModels(payload.items), savedAt, status: 'Đang hiển thị cache cục bộ còn hạn; chưa gọi API.' });
          else if (source === 'repos') setRepos({ items: normalizeRepos({ items: payload.items }), savedAt, status: 'Đang hiển thị cache cục bộ còn hạn; chưa gọi API.' });
          else if (source === 'news') setNews({ items: normalizeStories({ hits: payload.items }), savedAt, status: 'Cached locally; not calling the API.' });
          else setHle({ items: normalizeHleLeaderboard(payload.items), savedAt, status: 'Cached locally; not calling the API.' });
        } catch {
          // Storage can be disabled or contain malformed data; page remains usable.
        }
      }
      try {
        const lastRequest = Number(window.localStorage.getItem(LAST_REQUEST_KEY) || '0');
        if (Number.isFinite(lastRequest) && lastRequest > 0) setCooldownUntil(lastRequest + COOLDOWN_MS);
      } catch {
        // The cooldown is best-effort when browser storage is unavailable.
      }
      setStorageReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!cooldownUntil) return;
    const timer = window.setInterval(() => {
      const now = Date.now();
      setClockNow(now);
      if (now >= cooldownUntil) window.clearInterval(timer);
    }, 500);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  const getFeed = useCallback(async (source: SourceId) => {
    if (loadingSource) return;
    const now = Date.now();
    const current = source === 'models' ? models : source === 'repos' ? repos : source === 'news' ? news : hle;
    const updateStatus = (status: string) => {
      if (source === 'models') setModels((previous) => ({ ...previous, status }));
      else if (source === 'repos') setRepos((previous) => ({ ...previous, status }));
      else if (source === 'news') setNews((previous) => ({ ...previous, status }));
      else setHle((previous) => ({ ...previous, status }));
    };
    if (current.savedAt && now - current.savedAt < CACHE_MS && current.items.length) {
      updateStatus('Đang dùng cache cục bộ 30 phút; chưa phát sinh yêu cầu API mới.');
      return;
    }
    if (now < cooldownUntil) {
      updateStatus('Đang giới hạn tần suất. Hãy đợi ' + Math.ceil((cooldownUntil - now) / 1000) + ' giây.');
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10_000);
    const requestAt = Date.now();
    setLoadingSource(source);
    setClockNow(requestAt);
    setCooldownUntil(requestAt + COOLDOWN_MS);
    updateStatus('Đang tải trực tiếp từ nguồn công khai…');
    try { window.localStorage.setItem(LAST_REQUEST_KEY, String(requestAt)); }
    catch { /* In-memory throttling remains active for this page session. */ }

    const endpoints: Record<SourceId, string> = {
      models: 'https://huggingface.co/api/models?pipeline_tag=text-generation&sort=downloads&direction=-1&limit=8',
      repos: 'https://api.github.com/search/repositories?q=topic%3Allm&sort=stars&order=desc&per_page=8',
      news: 'https://hn.algolia.com/api/v1/search_by_date?query=AI%20model&tags=story&hitsPerPage=8',
      hle: 'https://huggingface.co/api/datasets/cais/hle/leaderboard',
    };

    try {
      const response = await fetch(endpoints[source], {
        method: 'GET', signal: controller.signal,
        headers: { Accept: 'application/json', ...(source === 'repos' ? { 'X-GitHub-Api-Version': '2022-11-28' } : {}) },
        cache: 'no-store', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer',
      });
      const payload = await readJsonLimited<unknown>(response);
      const normalized = source === 'models' ? normalizeModels(payload) : source === 'repos' ? normalizeRepos(payload) : source === 'news' ? normalizeStories(payload) : normalizeHleLeaderboard(payload);
      const savedAt = Date.now();
      const status = normalized.length
        ? 'Đã tải ' + normalized.length + ' mục. Dữ liệu chỉ mang tính tham khảo, không phải bảo chứng chất lượng.'
        : 'Nguồn API không trả về kết quả công khai phù hợp.';
      if (source === 'models') setModels({ items: normalizeModels(payload), savedAt, status });
      else if (source === 'repos') setRepos({ items: normalizeRepos(payload), savedAt, status });
      else if (source === 'news') setNews({ items: normalizeStories(payload), savedAt, status });
      else setHle({ items: normalizeHleLeaderboard(payload), savedAt, status });
      try { window.localStorage.setItem(CACHE_KEYS[source], JSON.stringify({ savedAt, items: normalized })); }
      catch { /* Keep results in memory when storage is unavailable. */ }
    } catch (cause) {
      updateStatus(cause instanceof Error && cause.name === 'AbortError'
        ? 'Nguồn phản hồi quá chậm; đã hủy yêu cầu sau 10 giây.'
        : cause instanceof Error ? cause.message : 'Không thể tải dữ liệu lúc này.');
    } finally {
      window.clearTimeout(timeout);
      setLoadingSource(null);
    }
  }, [cooldownUntil, loadingSource, models, news, repos, hle]);

  const disabled = (source: SourceId): boolean => {
    if (!storageReady || loadingSource !== null) return true;
    const savedAt = source === 'models' ? models.savedAt : source === 'repos' ? repos.savedAt : source === 'news' ? news.savedAt : hle.savedAt;
    const isFresh = typeof savedAt === 'number' && clockNow >= savedAt && clockNow - savedAt < CACHE_MS;
    return cooldownActive && !isFresh;
  };

  return (
    <div className="space-y-9 md:space-y-12">
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border-color)] bg-grid-warm bg-[var(--bg-surface)] px-5 py-8 sm:px-8 md:px-10 md:py-10">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[var(--accent)]/5 blur-3xl" />
        <div className="relative space-y-5">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--accent)]"><ArrowLeft size={14} /> Quay về trang chủ</Link>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-page)] px-3 py-1 text-[11px] font-mono text-[var(--accent)]"><Sparkles size={13} /> OPEN DATA LAB</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-page)] px-3 py-1 text-[11px] text-[var(--text-muted)]"><ShieldCheck size={13} /> Không cần tài khoản</span>
          </div>
          <h1 className="max-w-4xl text-3xl font-serif font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl md:text-5xl">Bức tranh AI và công nghệ từ dữ liệu mở.</h1>
          <p className="max-w-3xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">Khám phá mô hình AI đang được quan tâm, dự án mã nguồn mở và thảo luận công nghệ. Mỗi nguồn có liên kết gốc, giới hạn dữ liệu và cache cục bộ — trang không tự gọi API khi bạn mở.</p>
          <div className="flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
            <span className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2">01 · AI Models</span>
            <span className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2">02 · Open-source Radar</span>
            <span className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2">03 · Tech News</span>
            <span className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2">04 · Benchmarks</span>
          </div>
        </div>
      </section>

      <PublicCalculatorTools />

      {cooldownActive && (
        <div role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-[var(--text-secondary)]">
          Đang giới hạn các yêu cầu dữ liệu giữa các nguồn để tránh quá tải API bên thứ ba. Bạn có thể tải lại sau khoảng {Math.max(1, Math.ceil((cooldownUntil - clockNow) / 1000))} giây; dữ liệu cache vẫn xem được mà không gọi API mới.
        </div>
      )}

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <article className="min-w-0 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 sm:p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div><div className="mb-1 flex items-center gap-2 text-xs font-mono uppercase tracking-wide text-[var(--accent)]"><Sparkles size={14} /> MODEL RADAR</div><h2 className="text-lg font-serif font-bold">Mô hình AI</h2></div>
            <a href="https://huggingface.co/models" target="_blank" rel="noopener noreferrer" aria-label="Mở Hugging Face Hub" className="rounded-lg border border-[var(--border-color)] p-2 text-[var(--text-muted)] hover:text-[var(--accent)]"><ExternalLink size={14} /></a>
          </div>
          <p className="mb-4 text-xs leading-5 text-[var(--text-secondary)]">Tối đa 8 mô hình tạo văn bản phổ biến trên Hub. Lượt tải và lượt thích đo mức độ quan tâm, không phải benchmark.</p>
          <button type="button" onClick={() => getFeed('models')} disabled={disabled('models')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50">{loadingSource === 'models' ? <LoaderCircle size={14} className="animate-spin" /> : <ArrowDownToLine size={14} />}{loadingSource === 'models' ? 'Đang tải…' : models.items.length ? 'Xem / cập nhật dữ liệu' : 'Tải dữ liệu từ API'}</button>
          <p className="mt-3 min-h-10 text-[11px] leading-5 text-[var(--text-muted)]" aria-live="polite">{models.status}</p>
          {models.savedAt && <p className="mb-2 text-[10px] text-[var(--text-muted)]">Cập nhật {new Date(models.savedAt).toLocaleString('vi-VN')} · cache 30 phút</p>}
          <div className="space-y-2">
            {models.items.map((model) => (
              <a key={model.id} href={'https://huggingface.co/' + model.id.split('/').map(encodeURIComponent).join('/')} target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-[var(--border-color)] p-3 hover:border-[var(--border-focus)] hover:bg-[var(--bg-surface-subtle)]">
                <strong className="block break-all text-xs text-[var(--text-primary)]">{model.id}</strong>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[var(--text-muted)]"><span>Tải: {formatNumber(model.downloads)}</span><span>Thích: {formatNumber(model.likes)}</span>{model.pipeline_tag && <span>{model.pipeline_tag}</span>}</div>
              </a>
            ))}
          </div>
          <p className="mt-4 text-[10px] leading-5 text-[var(--text-muted)]">Nguồn: <a className="underline" href="https://huggingface.co/docs/hub/en/api" target="_blank" rel="noopener noreferrer">Hub API</a>. Không dùng token; request được gửi trực tiếp từ trình duyệt khách.</p>
        </article>

        <article className="min-w-0 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 sm:p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div><div className="mb-1 flex items-center gap-2 text-xs font-mono uppercase tracking-wide text-[var(--accent)]"><Code2 size={14} /> OPEN-SOURCE RADAR</div><h2 className="text-lg font-serif font-bold">Dự án AI mã nguồn mở</h2></div>
            <a href="https://github.com/topics/llm" target="_blank" rel="noopener noreferrer" aria-label="Mở GitHub LLM topic" className="rounded-lg border border-[var(--border-color)] p-2 text-[var(--text-muted)] hover:text-[var(--accent)]"><ExternalLink size={14} /></a>
          </div>
          <p className="mb-4 text-xs leading-5 text-[var(--text-secondary)]">Tối đa 8 repository theo chủ đề LLM, sắp xếp theo sao. Số sao không đồng nghĩa với an toàn hoặc chất lượng.</p>
          <button type="button" onClick={() => getFeed('repos')} disabled={disabled('repos')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50">{loadingSource === 'repos' ? <LoaderCircle size={14} className="animate-spin" /> : <ArrowDownToLine size={14} />}{loadingSource === 'repos' ? 'Đang tải…' : repos.items.length ? 'Xem / cập nhật dữ liệu' : 'Tải dữ liệu từ API'}</button>
          <p className="mt-3 min-h-10 text-[11px] leading-5 text-[var(--text-muted)]" aria-live="polite">{repos.status}</p>
          {repos.savedAt && <p className="mb-2 text-[10px] text-[var(--text-muted)]">Cập nhật {new Date(repos.savedAt).toLocaleString('vi-VN')} · cache 30 phút</p>}
          <div className="space-y-2">
            {repos.items.map((repo) => (
              <a key={repo.full_name} href={repo.html_url} target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-[var(--border-color)] p-3 hover:border-[var(--border-focus)] hover:bg-[var(--bg-surface-subtle)]">
                <strong className="block break-all text-xs text-[var(--text-primary)]">{repo.full_name}</strong>
                {repo.description && <p className="mt-1 line-clamp-3 text-[11px] leading-5 text-[var(--text-secondary)]">{repo.description}</p>}
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[var(--text-muted)]"><span className="inline-flex items-center gap-1"><Star size={10} /> {formatNumber(repo.stargazers_count)}</span>{repo.language && <span>{repo.language}</span>}{repo.updated_at && <span>Sửa {new Date(repo.updated_at).toLocaleDateString('vi-VN')}</span>}</div>
              </a>
            ))}
          </div>
          <p className="mt-4 text-[10px] leading-5 text-[var(--text-muted)]">Nguồn: <a className="underline" href="https://docs.github.com/en/rest/search/search" target="_blank" rel="noopener noreferrer">GitHub Search API</a>. Không khóa/token; giới hạn tìm kiếm riêng của GitHub vẫn áp dụng theo IP khách.</p>
        </article>

        <article className="min-w-0 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 sm:p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div><div className="mb-1 flex items-center gap-2 text-xs font-mono uppercase tracking-wide text-[var(--accent)]"><Newspaper size={14} /> TECH SIGNALS</div><h2 className="text-lg font-serif font-bold">Tin & thảo luận AI</h2></div>
            <a href="https://news.ycombinator.com/" target="_blank" rel="noopener noreferrer" aria-label="Mở Hacker News" className="rounded-lg border border-[var(--border-color)] p-2 text-[var(--text-muted)] hover:text-[var(--accent)]"><ExternalLink size={14} /></a>
          </div>
          <p className="mb-4 text-xs leading-5 text-[var(--text-secondary)]">Các câu chuyện gần đây khớp từ khóa AI model trên Hacker News, tối đa 8 mục. Đây là luồng thảo luận, không phải tin tức đã được biên tập xác minh.</p>
          <button type="button" onClick={() => getFeed('news')} disabled={disabled('news')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50">{loadingSource === 'news' ? <LoaderCircle size={14} className="animate-spin" /> : <ArrowDownToLine size={14} />}{loadingSource === 'news' ? 'Đang tải…' : news.items.length ? 'Xem / cập nhật dữ liệu' : 'Tải dữ liệu từ API'}</button>
          <p className="mt-3 min-h-10 text-[11px] leading-5 text-[var(--text-muted)]" aria-live="polite">{news.status}</p>
          {news.savedAt && <p className="mb-2 text-[10px] text-[var(--text-muted)]">Cập nhật {new Date(news.savedAt).toLocaleString('vi-VN')} · cache 30 phút</p>}
          <div className="space-y-2">
            {news.items.map((story) => (
              <div key={story.objectID} className="rounded-xl border border-[var(--border-color)] p-3">
                {story.url ? <a href={story.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold leading-5 text-[var(--text-primary)] hover:text-[var(--accent)]">{story.title}</a> : <p className="text-xs font-semibold leading-5 text-[var(--text-primary)]">{story.title}</p>}
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[var(--text-muted)]"><span>Điểm: {formatNumber(story.points)}</span><span>Bình luận: {formatNumber(story.num_comments)}</span>{story.created_at && <span>{new Date(story.created_at).toLocaleDateString('vi-VN')}</span>}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[10px] leading-5 text-[var(--text-muted)]">Nguồn: <a className="underline" href="https://hn.algolia.com/api" target="_blank" rel="noopener noreferrer">Hacker News Search API</a>; không proxy qua máy chủ site.</p>
        </article>

        <article className="min-w-0 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 sm:p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div><div className="mb-1 flex items-center gap-2 text-xs font-mono uppercase tracking-wide text-[var(--accent)]"><Trophy size={14} /> LIVE BENCHMARK</div><h2 className="text-lg font-serif font-bold">Humanity&apos;s Last Exam (HLE)</h2></div>
            <a href="https://huggingface.co/datasets/cais/hle/leaderboard" target="_blank" rel="noopener noreferrer" aria-label="Mở HLE leaderboard gốc" className="rounded-lg border border-[var(--border-color)] p-2 text-[var(--text-muted)] hover:text-[var(--accent)]"><ExternalLink size={14} /></a>
          </div>
          <p className="mb-4 text-xs leading-5 text-[var(--text-secondary)]">Điểm và thứ hạng từ leaderboard công khai của Hugging Face. Tải tối đa 8 dòng; giữ nguyên nhãn xác minh và ghi chú tác vụ, không tự quy đổi điểm thành phần trăm.</p>
          <button type="button" onClick={() => getFeed('hle')} disabled={disabled('hle')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50">{loadingSource === 'hle' ? <LoaderCircle size={14} className="animate-spin" /> : <ArrowDownToLine size={14} />}{loadingSource === 'hle' ? 'Đang tải…' : hle.items.length ? 'Xem / cập nhật leaderboard' : 'Tải điểm benchmark thật'}</button>
          <p className="mt-3 min-h-10 text-[11px] leading-5 text-[var(--text-muted)]" aria-live="polite">{hle.status}</p>
          {hle.savedAt && <p className="mb-2 text-[10px] text-[var(--text-muted)]">Cập nhật {new Date(hle.savedAt).toLocaleString('vi-VN')} · cache cục bộ 30 phút</p>}
          <div className="space-y-2">
            {hle.items.map((entry) => (
              <div key={entry.modelId} className="rounded-xl border border-[var(--border-color)] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><span className="text-[10px] font-mono text-[var(--accent)]">#{entry.rank}</span><a href={'https://huggingface.co/' + entry.modelId.split('/').map(encodeURIComponent).join('/')} target="_blank" rel="noopener noreferrer" className="mt-1 block break-all text-xs font-semibold text-[var(--text-primary)] hover:text-[var(--accent)]">{entry.modelId}</a></div>
                  <div className="shrink-0 text-right"><div className="text-xl font-bold tabular-nums text-[var(--text-primary)]">{new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(entry.value)}</div><div className="text-[9px] uppercase tracking-wide text-[var(--text-muted)]">Điểm HLE</div></div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                  <span className={entry.verified ? 'rounded-md border border-emerald-500/30 bg-emerald-500/5 px-2 py-1 text-emerald-700 dark:text-emerald-300' : 'rounded-md border border-amber-500/30 bg-amber-500/5 px-2 py-1 text-amber-700 dark:text-amber-300'}>{entry.verified ? 'Đã xác minh' : 'Chưa xác minh độc lập'}</span>
                  {entry.numParameters && <span className="rounded-md border border-[var(--border-color)] px-2 py-1 text-[var(--text-muted)]">Tham số: {formatNumber(entry.numParameters)}</span>}
                </div>
                {entry.notes && <p className="mt-2 text-[10px] leading-5 text-[var(--text-secondary)]">Ghi chú benchmark: {entry.notes}</p>}
              </div>
            ))}
          </div>
          <p className="mt-4 text-[10px] leading-5 text-[var(--text-muted)]">Nguồn: <a className="underline" href="https://huggingface.co/docs/hub/leaderboard-data-guide" target="_blank" rel="noopener noreferrer">Hugging Face Leaderboard API</a>. Một số điểm do cộng đồng gửi lên; hãy xem nhãn xác minh và ghi chú trước khi so sánh.</p>
        </article>
      </section>

      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--border-color)] pb-4">
          <div><div className="mb-1 flex items-center gap-2 text-xs font-mono uppercase tracking-wide text-[var(--accent)]"><BookOpen size={14} /> BENCHMARK HUB</div><h2 className="text-2xl font-serif font-bold text-[var(--text-primary)]">Đánh giá AI có nguồn và phương pháp</h2><p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--text-secondary)]">Benchmark có thể khác nhau theo phiên bản, ngôn ngữ, prompt và cách chấm. Xem nguồn gốc trước khi dùng một thứ hạng để quyết định.</p></div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-color)] px-3 py-1.5 text-[10px] text-[var(--text-muted)]"><Clock3 size={12} /> Liên kết gốc, không bịa điểm số</span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {benchmarks.map((item) => (
            <a key={item.name} href={item.href} target="_blank" rel="noopener noreferrer" className="group rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 transition hover:border-[var(--border-focus)] hover:bg-[var(--bg-surface-subtle)]">
              <div className="flex items-start justify-between gap-3"><div><span className="text-[10px] font-mono uppercase tracking-wide text-[var(--accent)]">{item.type}</span><h3 className="mt-1 text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)]">{item.name}</h3></div><ExternalLink size={15} className="mt-1 shrink-0 text-[var(--text-muted)]" /></div>
              <p className="mt-2 text-xs leading-6 text-[var(--text-secondary)]">{item.description}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface-subtle)] p-4 sm:p-6">
        <div className="flex items-start gap-3"><Info size={18} className="mt-0.5 shrink-0 text-[var(--accent)]" /><div><h2 className="text-sm font-bold">Giới hạn và quyền riêng tư</h2><p className="mt-1 text-xs leading-6 text-[var(--text-secondary)]">Không gọi API khi vừa mở trang. Mỗi lượt chỉ lấy tối đa 8 mục từ mỗi nguồn, timeout 10 giây, hủy phản hồi lớn hơn 180 KiB, cache local 30 phút và dùng chung thời gian chờ 45 giây giữa các nguồn. Request API gửi trực tiếp từ trình duyệt khách nên không tiêu tốn lượt gọi máy chủ Vercel của website; mỗi nhà cung cấp vẫn có giới hạn riêng và có thể tạm thời từ chối truy cập. Không gửi nội dung nhập riêng tư, không dùng khóa API, không có proxy mở cho người dùng.</p><p className="mt-2 text-[10px] text-[var(--text-muted)]">Dữ liệu ngoài được chuẩn hóa trước khi render; nội dung, sao, lượt tải và điểm bình chọn đều có thể thay đổi. Khi API không hoạt động, khách vẫn mở được nguồn chính thức.</p></div></div>
      </section>
    </div>
  );
}
