'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ExternalLink,
  FunctionSquare,
  GitFork,
  Globe2,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  CalculatorInputError,
  calculateScientificExpression,
} from '@/lib/tools/scientific-calculator';
import {
  convertUnits,
  UNIT_CATEGORIES,
  type UnitCategory,
} from '@/lib/tools/unit-converter';
import {
  normalizeGitHubRepositories,
  normalizeHuggingFaceModels,
  type GitHubRepository,
  type HuggingFaceModel,
} from '@/lib/tools/public-data';

type CalculationHistoryItem = {
  expression: string;
  result: number;
  at: number;
};

const MODEL_CACHE_KEY = 'webos:public:hf-model-radar:v1';
const LAST_MODEL_REQUEST_KEY = 'webos:public:hf-model-radar:last-request';
const MODEL_CACHE_TTL_MS = 15 * 60 * 1000;
const MODEL_REQUEST_COOLDOWN_MS = 20 * 1000;
const GITHUB_CACHE_KEY = 'webos:public:github-radar:v1';
const LAST_GITHUB_REQUEST_KEY = 'webos:public:github-radar:last-request';
const GITHUB_CACHE_TTL_MS = 60 * 60 * 1000;
const GITHUB_REQUEST_COOLDOWN_MS = 60 * 1000;

const calculatorKeys = [
  { label: 'AC', value: 'AC', kind: 'utility' },
  { label: '(', value: '(', kind: 'utility' },
  { label: ')', value: ')', kind: 'utility' },
  { label: '⌫', value: 'BACKSPACE', kind: 'utility' },
  { label: 'sin', value: 'sin(', kind: 'function' },
  { label: 'cos', value: 'cos(', kind: 'function' },
  { label: 'tan', value: 'tan(', kind: 'function' },
  { label: 'π', value: 'pi', kind: 'function' },
  { label: '7', value: '7', kind: 'number' },
  { label: '8', value: '8', kind: 'number' },
  { label: '9', value: '9', kind: 'number' },
  { label: '÷', value: '/', kind: 'operator' },
  { label: '4', value: '4', kind: 'number' },
  { label: '5', value: '5', kind: 'number' },
  { label: '6', value: '6', kind: 'number' },
  { label: '×', value: '*', kind: 'operator' },
  { label: '1', value: '1', kind: 'number' },
  { label: '2', value: '2', kind: 'number' },
  { label: '3', value: '3', kind: 'number' },
  { label: '−', value: '-', kind: 'operator' },
  { label: '0', value: '0', kind: 'number' },
  { label: '.', value: '.', kind: 'number' },
  { label: '^', value: '^', kind: 'operator' },
  { label: '+', value: '+', kind: 'operator' },
  { label: '√', value: 'sqrt(', kind: 'function' },
  { label: 'x²', value: '^2', kind: 'function' },
  { label: 'log', value: 'log(', kind: 'function' },
  { label: 'ln', value: 'ln(', kind: 'function' },
  { label: 'abs', value: 'abs(', kind: 'function' },
  { label: 'n!', value: '!', kind: 'function' },
  { label: '%', value: '%', kind: 'function' },
  { label: 'e', value: 'e', kind: 'function' },
] as const;

const benchmarkSources = [
  {
    name: 'Artificial Analysis',
    description: 'So sánh trí tuệ, tốc độ, độ trễ và giá của các mô hình theo bộ đánh giá riêng.',
    href: 'https://artificialanalysis.ai/models',
    tag: 'Chỉ số + hiệu năng',
  },
  {
    name: 'LMArena Leaderboard',
    description: 'Thứ hạng dựa trên bình chọn so sánh câu trả lời của người dùng.',
    href: 'https://lmarena.ai/leaderboard',
    tag: 'Đánh giá con người',
  },
  {
    name: 'Stanford HELM',
    description: 'Nghiên cứu đánh giá mô hình theo nhiều kịch bản và tiêu chí có phương pháp luận.',
    href: 'https://crfm.stanford.edu/helm/',
    tag: 'Nghiên cứu học thuật',
  },
  {
    name: 'Hugging Face Hub',
    description: 'Khám phá mô hình mở, thẻ tác vụ, thư viện, lượt tải và thông tin cập nhật.',
    href: 'https://huggingface.co/models',
    tag: 'Hệ sinh thái mô hình',
  },
];

function formatNumber(value: number | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return '—';
  return new Intl.NumberFormat('vi-VN', { notation: value >= 100_000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value);
}

function getCachedModels(): { savedAt: number; models: HuggingFaceModel[] } | null {
  try {
    const raw = window.localStorage.getItem(MODEL_CACHE_KEY);
    if (!raw || raw.length > 120_000) return null;
    const parsed = JSON.parse(raw) as { savedAt?: unknown; models?: unknown };
    const now = Date.now();
    if (
      typeof parsed.savedAt !== 'number' ||
      !Number.isFinite(parsed.savedAt) ||
      parsed.savedAt > now + 60_000 ||
      now - parsed.savedAt > MODEL_CACHE_TTL_MS ||
      !Array.isArray(parsed.models)
    ) return null;
    // localStorage is untrusted input; normalize fields before rendering anything.
    const models = normalizeHuggingFaceModels(parsed.models);
    return { savedAt: parsed.savedAt, models };
  } catch {
    return null;
  }
}

function getCachedGitHubRepositories(): { savedAt: number; repositories: GitHubRepository[] } | null {
  try {
    const raw = window.localStorage.getItem(GITHUB_CACHE_KEY);
    if (!raw || raw.length > 80_000) return null;
    const parsed = JSON.parse(raw) as { savedAt?: unknown; repositories?: unknown };
    const now = Date.now();
    if (
      typeof parsed.savedAt !== 'number' ||
      !Number.isFinite(parsed.savedAt) ||
      parsed.savedAt > now + 60_000 ||
      now - parsed.savedAt > GITHUB_CACHE_TTL_MS ||
      !Array.isArray(parsed.repositories)
    ) return null;
    // Convert the persisted normalized shape back through the same strict validator.
    const repositories = normalizeGitHubRepositories({
      items: parsed.repositories.map((row) => {
        if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
        const repo = row as Record<string, unknown>;
        return {
          full_name: repo.fullName,
          stargazers_count: repo.stars,
          forks_count: repo.forks,
          description: repo.description,
          language: repo.language,
          updated_at: repo.updatedAt,
        };
      }),
    });
    return { savedAt: parsed.savedAt, repositories };
  } catch {
    return null;
  }
}

export default function PublicToolsPage() {
  const [expression, setExpression] = useState('sqrt(144) + 2^3');
  const [result, setResult] = useState<number | null>(null);
  const [calculatorError, setCalculatorError] = useState('');
  const [angleMode, setAngleMode] = useState<'deg' | 'rad'>('deg');
  const [history, setHistory] = useState<CalculationHistoryItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const [unitCategory, setUnitCategory] = useState<UnitCategory>('length');
  const [unitValue, setUnitValue] = useState('1');
  const [unitFrom, setUnitFrom] = useState('m');
  const [unitTo, setUnitTo] = useState('km');
  let convertedValue: number | null = null;
  if (unitValue.trim() !== '') {
    try {
      convertedValue = convertUnits(Number(unitValue), unitCategory, unitFrom, unitTo);
    } catch {
      convertedValue = null;
    }
  }

  const [models, setModels] = useState<HuggingFaceModel[]>([]);
  const [modelStatus, setModelStatus] = useState('Chỉ tải dữ liệu khi bạn bấm nút. Không có yêu cầu nền hoặc tự làm mới.');
  const [modelsLoading, setModelsLoading] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [lastModelsUpdated, setLastModelsUpdated] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [repoStatus, setRepoStatus] = useState('Chỉ tải khi bấm nút. Một trang tối đa 10 repository, cache cục bộ 60 phút.');
  const [reposLoading, setReposLoading] = useState(false);
  const [reposCooldownUntil, setReposCooldownUntil] = useState(0);
  const [lastReposUpdated, setLastReposUpdated] = useState<number | null>(null);
  const repoAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Defer storage synchronization until after the initial render.
    const frame = window.requestAnimationFrame(() => {
      try {
        const lastRequest = Number(window.localStorage.getItem(LAST_MODEL_REQUEST_KEY) || '0');
        const storedCooldownUntil = lastRequest + MODEL_REQUEST_COOLDOWN_MS;
        if (Number.isFinite(lastRequest) && storedCooldownUntil > Date.now()) {
          setCooldownUntil(storedCooldownUntil);
        }
        const cached = getCachedModels();
        if (cached) {
          setModels(cached.models);
          setLastModelsUpdated(cached.savedAt);
        }

        const lastRepoRequest = Number(window.localStorage.getItem(LAST_GITHUB_REQUEST_KEY) || '0');
        const storedRepoCooldownUntil = lastRepoRequest + GITHUB_REQUEST_COOLDOWN_MS;
        if (Number.isFinite(lastRepoRequest) && storedRepoCooldownUntil > Date.now()) {
          setReposCooldownUntil(storedRepoCooldownUntil);
        }
        const cachedRepos = getCachedGitHubRepositories();
        if (cachedRepos) {
          setRepositories(cachedRepos.repositories);
          setLastReposUpdated(cachedRepos.savedAt);
        }
      } catch {
        // Private browsing or storage-disabled browsers still retain in-memory functionality.
      }
    });
    return () => {
      window.cancelAnimationFrame(frame);
      abortRef.current?.abort();
      repoAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!cooldownUntil) return;
    const timer = window.setInterval(() => {
      if (Date.now() >= cooldownUntil) setCooldownUntil(0);
    }, 500);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  useEffect(() => {
    if (!reposCooldownUntil) return;
    const timer = window.setInterval(() => {
      if (Date.now() >= reposCooldownUntil) setReposCooldownUntil(0);
    }, 500);
    return () => window.clearInterval(timer);
  }, [reposCooldownUntil]);

  const runCalculation = useCallback(() => {
    try {
      const nextResult = calculateScientificExpression(expression, angleMode);
      setResult(nextResult);
      setCalculatorError('');
      setHistory((old) => [{ expression, result: nextResult, at: Date.now() }, ...old].slice(0, 8));
    } catch (error) {
      setResult(null);
      setCalculatorError(error instanceof CalculatorInputError ? error.message : 'Không thể tính biểu thức này.');
    }
  }, [angleMode, expression]);

  const insertCalculatorText = useCallback((value: string) => {
    setCalculatorError('');
    if (value === 'AC') {
      setExpression('');
      setResult(null);
      return;
    }
    if (value === 'BACKSPACE') {
      setExpression((old) => old.slice(0, -1));
      return;
    }
    setExpression((old) => old + value);
    inputRef.current?.focus();
  }, []);

  const fetchModels = useCallback(async () => {
    if (modelsLoading) return;
    const now = Date.now();
    const cached = getCachedModels();
    if (cached) {
      setModels(cached.models);
      setLastModelsUpdated(cached.savedAt);
      setModelStatus('Đang dùng bản lưu cục bộ còn hạn; sẽ không gọi API thêm.');
      return;
    }

    if (now < cooldownUntil) {
      setModelStatus('Đang giới hạn tần suất. Hãy đợi ' + Math.ceil((cooldownUntil - now) / 1000) + ' giây rồi thử lại.');
      return;
    }

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    setModelsLoading(true);
    const requestedAt = Date.now();
    setCooldownUntil(requestedAt + MODEL_REQUEST_COOLDOWN_MS);
    setModelStatus('Đang yêu cầu một trang dữ liệu nhỏ từ Hugging Face…');
    try {
      window.localStorage.setItem(LAST_MODEL_REQUEST_KEY, String(requestedAt));
    } catch {
      // The in-memory cooldown still applies when local storage is unavailable.
    }
    const timeout = window.setTimeout(() => controller.abort(), 12_000);

    try {
      // Fixed, read-only public endpoint. No user-controlled URL, API key, or server proxy.
      const response = await fetch(
        'https://huggingface.co/api/models?pipeline_tag=text-generation&sort=downloads&direction=-1&limit=12',
        { method: 'GET', signal: controller.signal, headers: { Accept: 'application/json' }, cache: 'no-store' },
      );
      if (!response.ok) throw new Error(response.status === 429
        ? 'Hugging Face đang giới hạn truy cập. Hãy thử lại sau.'
        : 'Hugging Face trả về HTTP ' + response.status + '.');
      const payload: unknown = await response.json();
      const safeModels = normalizeHuggingFaceModels(payload);
      setModels(safeModels);
      setLastModelsUpdated(Date.now());
      setModelStatus(safeModels.length
        ? 'Đã tải ' + safeModels.length + ' mô hình công khai. Thông tin phổ biến không đồng nghĩa với điểm benchmark.'
        : 'API không trả về mô hình công khai phù hợp.');
      try {
        window.localStorage.setItem(MODEL_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), models: safeModels }));
      } catch {
        // Results remain visible for this page session if storage is unavailable.
      }
    } catch (error) {
      setModelStatus(error instanceof Error && error.name === 'AbortError'
        ? 'Yêu cầu quá thời gian hoặc bị hủy. Dữ liệu cũ vẫn được giữ nếu có.'
        : error instanceof Error ? error.message : 'Không thể tải dữ liệu mô hình lúc này.');
    } finally {
      window.clearTimeout(timeout);
      setModelsLoading(false);
      abortRef.current = null;
    }
  }, [cooldownUntil, modelsLoading]);

  const fetchRepositories = useCallback(async () => {
    if (reposLoading) return;
    const now = Date.now();
    const cached = getCachedGitHubRepositories();
    if (cached) {
      setRepositories(cached.repositories);
      setLastReposUpdated(cached.savedAt);
      setRepoStatus('Đang dùng cache cục bộ còn hạn; không gọi GitHub thêm.');
      return;
    }

    let storedRequest = 0;
    try {
      storedRequest = Number(window.localStorage.getItem(LAST_GITHUB_REQUEST_KEY) || '0');
    } catch {
      // Continue with the current page's in-memory cooldown when storage is unavailable.
    }
    const storedCooldownUntil = storedRequest + GITHUB_REQUEST_COOLDOWN_MS;
    const effectiveCooldownUntil = Math.max(reposCooldownUntil, storedCooldownUntil);
    if (now < effectiveCooldownUntil) {
      setRepoStatus('Đang giới hạn tần suất. Hãy đợi ' + Math.ceil((effectiveCooldownUntil - now) / 1000) + ' giây rồi thử lại.');
      setReposCooldownUntil(effectiveCooldownUntil);
      return;
    }

    const controller = new AbortController();
    repoAbortRef.current?.abort();
    repoAbortRef.current = controller;
    setReposLoading(true);
    const requestedAt = Date.now();
    setReposCooldownUntil(requestedAt + GITHUB_REQUEST_COOLDOWN_MS);
    setRepoStatus('Đang tải tối đa 10 repository công khai từ GitHub…');
    try {
      window.localStorage.setItem(LAST_GITHUB_REQUEST_KEY, String(requestedAt));
    } catch {
      // In-memory cooldown still applies when local storage is disabled.
    }
    const timeout = window.setTimeout(() => controller.abort(), 12_000);

    try {
      // Fixed anonymous GET; no token, user-controlled query, backend proxy or polling.
      const response = await fetch(
        'https://api.github.com/search/repositories?q=stars%3A%3E10000&sort=stars&order=desc&per_page=10',
        {
          method: 'GET',
          signal: controller.signal,
          headers: {
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
          cache: 'no-store',
        },
      );
      if (!response.ok) {
        const remaining = response.headers.get('x-ratelimit-remaining');
        const resetSeconds = Number(response.headers.get('x-ratelimit-reset'));
        if ((response.status === 403 || response.status === 429) && remaining === '0' &&
            Number.isFinite(resetSeconds) && resetSeconds > 0) {
          const resetAt = resetSeconds * 1000;
          const retryAt = Math.max(requestedAt + GITHUB_REQUEST_COOLDOWN_MS, resetAt);
          setReposCooldownUntil(retryAt);
          try {
            window.localStorage.setItem(LAST_GITHUB_REQUEST_KEY, String(retryAt - GITHUB_REQUEST_COOLDOWN_MS));
          } catch {
            // A longer server-provided cooldown is still enforced in this tab.
          }
          throw new Error('GitHub đã hết hạn mức cho IP hiện tại. Có thể thử lại sau ' + new Date(resetAt).toLocaleTimeString('vi-VN') + '.');
        }
        if (response.status === 403 || response.status === 429) {
          throw new Error('GitHub đang giới hạn yêu cầu. Vui lòng thử lại sau; website không tự lặp yêu cầu.');
        }
        throw new Error('GitHub trả về HTTP ' + response.status + '.');
      }

      const payload: unknown = await response.json();
      const safeRepositories = normalizeGitHubRepositories(payload);
      setRepositories(safeRepositories);
      const savedAt = Date.now();
      setLastReposUpdated(savedAt);
      setRepoStatus(safeRepositories.length
        ? 'Đã tải ' + safeRepositories.length + ' repository công khai; xếp theo sao, không phải benchmark chất lượng.'
        : 'GitHub không trả về repository phù hợp với bộ lọc hiện tại.');
      try {
        window.localStorage.setItem(GITHUB_CACHE_KEY, JSON.stringify({
          savedAt,
          repositories: safeRepositories,
        }));
      } catch {
        // Results remain available for this tab when storage is unavailable.
      }
    } catch (error) {
      setRepoStatus(error instanceof Error && error.name === 'AbortError'
        ? 'Yêu cầu GitHub quá thời gian hoặc bị hủy. Hãy thử lại sau khi hết giới hạn tần suất.'
        : error instanceof Error ? error.message : 'Không thể tải repository lúc này.');
    } finally {
      window.clearTimeout(timeout);
      setReposLoading(false);
      repoAbortRef.current = null;
    }
  }, [reposCooldownUntil, reposLoading]);

  return (
    <div className="space-y-10 md:space-y-14">
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border-color)] bg-grid-warm bg-[var(--bg-surface)] px-5 py-8 sm:px-8 md:px-10 md:py-10">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[var(--accent)]/5 blur-3xl" />
        <div className="relative space-y-5">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--accent)]">
            <ArrowLeft size={14} /> Quay về trang chủ
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-page)] px-3 py-1 text-[11px] font-mono text-[var(--accent)]">
              <Sparkles size={13} /> OPEN TOOLKIT
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-page)] px-3 py-1 text-[11px] text-[var(--text-muted)]">
              <ShieldCheck size={13} /> Tính toán tại trình duyệt
            </span>
          </div>
          <h1 className="max-w-4xl text-3xl font-serif font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl md:text-5xl">
            Công cụ hữu ích. Dữ liệu mở. Không cần tài khoản.
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
            Một phòng công cụ nhỏ cho việc học, làm việc và khám phá AI. Máy tính chạy cục bộ; danh sách mô hình chỉ tải khi bạn chủ động yêu cầu, không đi qua máy chủ của website.
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
            <span className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2">01 · Máy tính khoa học</span>
            <span className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2">02 · Chuyển đổi đơn vị</span>
            <span className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2">03 · AI & Open-source Radar</span>
            <span className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2">04 · Benchmark Hub</span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="min-w-0 space-y-6">
        <div className="min-w-0 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 sm:p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="mb-1 flex items-center gap-2 text-xs font-mono uppercase tracking-wide text-[var(--accent)]">
                <FunctionSquare size={15} /> CALCULATOR
              </div>
              <h2 className="text-xl font-serif font-bold">Máy tính khoa học</h2>
              <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">Không dùng eval hoặc thực thi mã. Tối đa 300 ký tự mỗi biểu thức.</p>
            </div>
            <div className="flex rounded-lg border border-[var(--border-color)] p-1" aria-label="Chế độ góc">
              {(['deg', 'rad'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setAngleMode(mode)}
                  aria-pressed={angleMode === mode}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase transition-colors ${angleMode === mode ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-subtle)]'}`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={(event) => { event.preventDefault(); runCalculation(); }} className="space-y-3">
            <label htmlFor="calculator-expression" className="sr-only">Biểu thức toán học</label>
            <input
              ref={inputRef}
              id="calculator-expression"
              value={expression}
              onChange={(event) => { setExpression(event.target.value); setCalculatorError(''); }}
              maxLength={300}
              autoComplete="off"
              spellCheck={false}
              inputMode="decimal"
              placeholder="Ví dụ: sin(30) + sqrt(81)"
              className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-page)] px-4 py-4 text-right font-mono text-base outline-none transition focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--accent)]/10 sm:text-lg"
            />
            <div className="flex min-h-14 items-center justify-between gap-3 rounded-xl bg-[var(--bg-surface-subtle)] px-4 py-3">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Kết quả</div>
                <div className="break-all font-mono text-xl font-semibold text-[var(--text-primary)] sm:text-2xl" aria-live="polite">
                  {result === null ? '—' : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 12 }).format(result)}
                </div>
              </div>
              <button type="submit" className="shrink-0 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)]">
                Tính =
              </button>
            </div>
            {calculatorError && (
              <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-600 dark:text-red-300">{calculatorError}</p>
            )}
          </form>

          <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-4" aria-label="Bàn phím máy tính">
            {calculatorKeys.map((key) => (
              <button
                key={key.label}
                type="button"
                onClick={() => insertCalculatorText(key.value)}
                aria-label={key.label === 'AC' ? 'Xóa toàn bộ' : key.label === '⌫' ? 'Xóa ký tự cuối' : 'Thêm ' + key.label}
                className={`min-h-11 rounded-lg border px-2 py-2.5 text-sm font-semibold transition active:scale-[0.98] ${key.kind === 'operator' ? 'border-[var(--accent)]/20 bg-[var(--accent-light)] text-[var(--accent)]' : key.kind === 'number' ? 'border-[var(--border-color)] bg-[var(--bg-page)] text-[var(--text-primary)] hover:border-[var(--border-focus)]' : key.kind === 'utility' ? 'border-[var(--border-color)] bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]' : 'border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-focus)] hover:text-[var(--accent)]'}`}
              >
                {key.label}
              </button>
            ))}
          </div>

          <div className="mt-5 border-t border-[var(--border-color)] pt-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-[var(--text-secondary)]">Lịch sử gần đây</h3>
              <button type="button" onClick={() => setHistory([])} className="text-[11px] text-[var(--text-muted)] hover:text-[var(--accent)]">Xóa lịch sử</button>
            </div>
            {history.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">Kết quả bạn vừa tính sẽ hiện ở đây trong phiên này.</p>
            ) : (
              <div className="space-y-1.5">
                {history.slice(0, 5).map((item, index) => (
                  <button
                    type="button"
                    key={item.at + ':' + index}
                    onClick={() => { setExpression(item.expression); setResult(item.result); setCalculatorError(''); }}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-[var(--bg-surface-subtle)]"
                  >
                    <span className="min-w-0 truncate font-mono text-xs text-[var(--text-secondary)]">{item.expression}</span>
                    <span className="shrink-0 font-mono text-xs font-semibold text-[var(--text-primary)]">{new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 10 }).format(item.result)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="mt-4 text-[11px] leading-5 text-[var(--text-muted)]">
            Hỗ trợ +, −, ×, ÷, lũy thừa, phần trăm, giai thừa, ngoặc, π, e, sin/cos/tan, hàm lượng giác ngược, sqrt, cbrt, abs, log, ln, exp, floor, ceil và round.
          </p>
        </div>

        <section className="min-w-0 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 sm:p-6">
          <div className="mb-4 flex items-center gap-2 text-xs font-mono uppercase tracking-wide text-[var(--accent)]">
            <RotateCcw size={15} /> UNIT CONVERTER
          </div>
          <h2 className="text-xl font-serif font-bold">Bộ chuyển đổi đơn vị</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
            5 nhóm đơn vị thường dùng; chuyển đổi ngay trong trình duyệt, không gọi API.
          </p>
          <div className="mt-4 space-y-3">
            <label className="block space-y-1.5">
              <span className="text-xs text-[var(--text-secondary)]">Nhóm đơn vị</span>
              <select
                value={unitCategory}
                onChange={(event) => {
                  const nextCategory = event.target.value as UnitCategory;
                  const options = UNIT_CATEGORIES[nextCategory].units;
                  setUnitCategory(nextCategory);
                  setUnitFrom(options[0].value);
                  setUnitTo(options[1].value);
                }}
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] px-3 py-2.5 text-sm text-[var(--text-primary)]"
              >
                {Object.entries(UNIT_CATEGORIES).map(([key, category]) => (
                  <option value={key} key={key}>{category.label}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs text-[var(--text-secondary)]">Giá trị đầu vào</span>
              <input
                type="number"
                inputMode="decimal"
                value={unitValue}
                onChange={(event) => setUnitValue(event.target.value)}
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] px-3 py-3 font-mono text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]"
              />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
              <label className="block min-w-0 space-y-1.5">
                <span className="text-xs text-[var(--text-secondary)]">Từ đơn vị</span>
                <select value={unitFrom} onChange={(event) => setUnitFrom(event.target.value)} className="w-full min-w-0 rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] px-3 py-2.5 text-xs text-[var(--text-primary)]">
                  {UNIT_CATEGORIES[unitCategory].units.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
                </select>
              </label>
              <button type="button" onClick={() => { setUnitFrom(unitTo); setUnitTo(unitFrom); }} className="min-h-10 rounded-lg border border-[var(--border-color)] px-3 text-xs text-[var(--text-secondary)] hover:border-[var(--border-focus)] hover:text-[var(--accent)]" title="Đổi chiều chuyển đổi">
                ⇄
              </button>
              <label className="block min-w-0 space-y-1.5">
                <span className="text-xs text-[var(--text-secondary)]">Sang đơn vị</span>
                <select value={unitTo} onChange={(event) => setUnitTo(event.target.value)} className="w-full min-w-0 rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] px-3 py-2.5 text-xs text-[var(--text-primary)]">
                  {UNIT_CATEGORIES[unitCategory].units.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
                </select>
              </label>
            </div>
            <div className="rounded-xl bg-[var(--bg-surface-subtle)] px-4 py-4">
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Kết quả quy đổi</div>
              <div className="mt-1 break-all font-mono text-xl font-semibold text-[var(--text-primary)]" aria-live="polite">
                {convertedValue === null ? 'Nhập một số hữu hạn' : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 12 }).format(convertedValue)}
              </div>
            </div>
          </div>
          <p className="mt-3 text-[10px] leading-5 text-[var(--text-muted)]">
            Dung lượng dữ liệu phân biệt hệ thập phân (KB/MB/GB = bội số 1000) và hệ nhị phân (KiB/MiB/GiB = bội số 1024).
          </p>
        </section>
        </div>

        <div className="min-w-0 space-y-6">
          <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 sm:p-6">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="mb-1 flex items-center gap-2 text-xs font-mono uppercase tracking-wide text-[var(--accent)]">
                  <Activity size={15} /> AI MODEL RADAR
                </div>
                <h2 className="text-xl font-serif font-bold">Mô hình AI đang phổ biến</h2>
              </div>
              <span className="rounded-md border border-[var(--border-color)] px-2 py-1 text-[10px] text-[var(--text-muted)]">Đọc công khai</span>
            </div>
            <p className="mb-4 text-xs leading-6 text-[var(--text-secondary)]">
              Truy vấn trực tiếp Hugging Face Hub API từ trình duyệt, cố định ở tối đa 12 model tạo văn bản. Không qua API của website, không cần khóa. Lượt tải/lượt thích chỉ cho biết mức độ quan tâm, không phải điểm chất lượng hay benchmark.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={fetchModels}
                disabled={modelsLoading}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {modelsLoading ? <LoaderCircle size={14} className="animate-spin" /> : <ArrowDownToLine size={14} />}
                {modelsLoading ? 'Đang tải…' : models.length ? 'Dùng cache / kiểm tra hạn' : 'Tải danh sách model'}
              </button>
              <a href="https://huggingface.co/models" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-color)] px-3 py-2.5 text-xs text-[var(--text-secondary)] hover:text-[var(--accent)]">
                Hub gốc <ExternalLink size={12} />
              </a>
            </div>
            <p className="mt-3 min-h-10 text-[11px] leading-5 text-[var(--text-muted)]" aria-live="polite">{modelStatus}</p>
            {lastModelsUpdated && (
              <p className="mb-3 text-[10px] text-[var(--text-muted)]">
                Bản dữ liệu {new Date(lastModelsUpdated).toLocaleString('vi-VN')}{' '}
                {'· cache cục bộ 15 phút'}
              </p>
            )}
            {models.length > 0 ? (
              <div className="space-y-2">
                {models.map((model) => (
                  <a
                    href={'https://huggingface.co/' + encodeURIComponent(model.id).replace(/%2F/g, '/')}
                    target="_blank"
                    rel="noopener noreferrer"
                    key={model.id}
                    className="block rounded-xl border border-[var(--border-color)] p-3 transition hover:border-[var(--border-focus)] hover:bg-[var(--bg-surface-subtle)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="break-all text-xs font-semibold text-[var(--text-primary)]">{model.id}</span>
                      <ExternalLink size={12} className="mt-0.5 shrink-0 text-[var(--text-muted)]" />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[var(--text-muted)]">
                      <span>Lượt tải: <strong className="text-[var(--text-secondary)]">{formatNumber(model.downloads)}</strong></span>
                      <span>Lượt thích: <strong className="text-[var(--text-secondary)]">{formatNumber(model.likes)}</strong></span>
                      {model.pipeline_tag && <span>{model.pipeline_tag}</span>}
                      {model.library_name && <span>{model.library_name}</span>}
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--border-color)] px-4 py-8 text-center">
                <Globe2 size={22} className="mx-auto mb-2 text-[var(--text-muted)]" />
                <p className="text-xs text-[var(--text-secondary)]">Chưa có dữ liệu trong phiên này.</p>
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">Bạn vẫn có thể mở Hub gốc ở liên kết phía trên.</p>
              </div>
            )}
            <p className="mt-3 text-[10px] leading-5 text-[var(--text-muted)]">
              Nguồn: <a className="underline underline-offset-2 hover:text-[var(--accent)]" href="https://huggingface.co/docs/hub/en/api" target="_blank" rel="noopener noreferrer">Hugging Face Hub API</a>. Làm mới tối đa một lần mỗi 20 giây trên trình duyệt; cache cục bộ 15 phút.
            </p>
          </section>

          <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 sm:p-6">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="mb-1 flex items-center gap-2 text-xs font-mono uppercase tracking-wide text-[var(--accent)]">
                  <GitFork size={15} /> OPEN-SOURCE RADAR
                </div>
                <h2 className="text-xl font-serif font-bold">Repository mã nguồn mở nổi bật</h2>
              </div>
              <span className="rounded-md border border-[var(--border-color)] px-2 py-1 text-[10px] text-[var(--text-muted)]">GitHub API công khai</span>
            </div>
            <p className="mb-4 text-xs leading-6 text-[var(--text-secondary)]">
              Xem tối đa 10 repository công khai có trên 10.000 sao, xếp theo sao. Đây là tín hiệu quan tâm của cộng đồng, không phải xếp hạng chất lượng hay benchmark.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={fetchRepositories}
                disabled={reposLoading}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {reposLoading ? <LoaderCircle size={14} className="animate-spin" /> : <GitFork size={14} />}
                {reposLoading ? 'Đang tải…' : repositories.length ? 'Dùng cache / kiểm tra hạn' : 'Tải repository nổi bật'}
              </button>
              <a href="https://github.com/explore" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-color)] px-3 py-2.5 text-xs text-[var(--text-secondary)] hover:text-[var(--accent)]">
                GitHub Explore <ExternalLink size={12} />
              </a>
            </div>
            <p className="mt-3 min-h-10 text-[11px] leading-5 text-[var(--text-muted)]" aria-live="polite">{repoStatus}</p>
            {lastReposUpdated && (
              <p className="mb-3 text-[10px] text-[var(--text-muted)]">
                Bản dữ liệu {new Date(lastReposUpdated).toLocaleString('vi-VN')} · cache cục bộ 60 phút
              </p>
            )}
            {repositories.length > 0 ? (
              <div className="space-y-2">
                {repositories.map((repo) => (
                  <a
                    href={'https://github.com/' + encodeURIComponent(repo.fullName).replace(/%2F/g, '/')}
                    target="_blank"
                    rel="noopener noreferrer"
                    key={repo.fullName.toLowerCase()}
                    className="block rounded-xl border border-[var(--border-color)] p-3 transition hover:border-[var(--border-focus)] hover:bg-[var(--bg-surface-subtle)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="break-all text-xs font-semibold text-[var(--text-primary)]">{repo.fullName}</span>
                      <ExternalLink size={12} className="mt-0.5 shrink-0 text-[var(--text-muted)]" />
                    </div>
                    <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                      {repo.description || 'Repository không cung cấp mô tả.'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[var(--text-muted)]">
                      <span>★ <strong className="text-[var(--text-secondary)]">{formatNumber(repo.stars)}</strong></span>
                      <span>Forks: <strong className="text-[var(--text-secondary)]">{formatNumber(repo.forks)}</strong></span>
                      {repo.language && <span>{repo.language}</span>}
                      {repo.updatedAt && <span>Cập nhật: {repo.updatedAt.slice(0, 10)}</span>}
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--border-color)] px-4 py-6 text-center">
                <GitFork size={22} className="mx-auto mb-2 text-[var(--text-muted)]" />
                <p className="text-xs text-[var(--text-secondary)]">Chưa có dữ liệu trong phiên này.</p>
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">Danh sách chỉ được tải khi bạn bấm nút.</p>
              </div>
            )}
            <p className="mt-3 text-[10px] leading-5 text-[var(--text-muted)]">
              Gọi trực tiếp GitHub Search API từ trình duyệt; tối đa 10 kết quả, timeout 12 giây, cooldown tối thiểu 60 giây và cache cục bộ 60 phút. Giới hạn API của GitHub áp dụng theo IP người truy cập; website không proxy, không dùng token và không tự retry.
              {' '}<a className="underline underline-offset-2 hover:text-[var(--accent)]" href="https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api" target="_blank" rel="noopener noreferrer">Quy định rate limit</a>.
            </p>
          </section>

          <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 sm:p-6">
            <div className="mb-4 flex items-center gap-2 text-xs font-mono uppercase tracking-wide text-[var(--accent)]">
              <BookOpen size={15} /> BENCHMARK HUB
            </div>
            <h2 className="text-xl font-serif font-bold">Đối chiếu AI đúng cách</h2>
            <p className="mt-2 text-xs leading-6 text-[var(--text-secondary)]">
              Không có một bảng xếp hạng nào đo được mọi năng lực. Hãy đối chiếu phương pháp chấm, ngày cập nhật, độ trễ, chi phí và loại tác vụ trước khi chọn mô hình.
            </p>
            <div className="mt-4 space-y-3">
              {benchmarkSources.map((source) => (
                <a
                  href={source.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  key={source.name}
                  className="group block rounded-xl border border-[var(--border-color)] p-3.5 transition hover:border-[var(--border-focus)] hover:bg-[var(--bg-surface-subtle)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)]">{source.name}</div>
                      <div className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{source.description}</div>
                    </div>
                    <ExternalLink size={14} className="mt-1 shrink-0 text-[var(--text-muted)]" />
                  </div>
                  <span className="mt-3 inline-flex rounded-md bg-[var(--bg-surface-subtle)] px-2 py-1 text-[10px] text-[var(--text-muted)]">{source.tag}</span>
                </a>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface-subtle)] p-5 sm:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-serif font-bold">Dùng công cụ mà không đánh đổi quyền riêng tư</h2>
            <p className="mt-1 max-w-3xl text-xs leading-6 text-[var(--text-secondary)]">
              Máy tính không gửi biểu thức lên mạng. Radar chỉ gọi một API công khai khi bạn chủ động bấm, không gửi dữ liệu cá nhân và không dùng máy chủ website làm proxy. Không có tính năng nào yêu cầu đăng nhập hoặc khóa API.
            </p>
          </div>
          <Link href="/resources" className="inline-flex shrink-0 items-center gap-2 text-xs font-semibold text-[var(--accent)] hover:underline">
            Khám phá thêm tài nguyên <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </div>
  );
}
