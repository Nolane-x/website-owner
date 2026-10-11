'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
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
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { normalizeHleLeaderboard, type HleLeaderboardEntry } from '@/lib/open-data/hle-leaderboard';
import {
  normalizeEuropePmcPapers,
  normalizePublicFeedText,
  normalizeSecurityAdvisories,
  type EuropePmcPaper,
  type PublicSecurityAdvisory,
} from '@/lib/open-data/public-feeds';

type Model = { id: string; downloads?: number; likes?: number; pipeline_tag?: string; lastModified?: string; tags?: string[]; library_name?: string; gated?: string | boolean };
type Repository = { full_name: string; html_url: string; description?: string | null; stargazers_count?: number; forks_count?: number; open_issues_count?: number; language?: string | null; updated_at?: string; created_at?: string; default_branch?: string; topics?: string[]; license?: { name?: string; spdx_id?: string } | null; archived?: boolean };
type Story = { objectID: string; title?: string; story_title?: string; url?: string | null; story_url?: string | null; story_text?: string | null; author?: string; points?: number; num_comments?: number; created_at?: string };
type SourceId = 'models' | 'repos' | 'news' | 'hle' | 'papers' | 'security';
type FeedState<T> = { items: T[]; savedAt: number | null; status: string };
type CooldownState = Partial<Record<SourceId, number>>;

const CACHE_MS = 5 * 60 * 1000;
const REFRESH_CHECK_MS = 30 * 1000;
const COOLDOWN_MS = 15 * 1000;
const MAX_RESPONSE_BYTES = 180 * 1024;
const CACHE_KEYS: Record<SourceId, string> = {
  models: 'webos:public-feed:v3:models',
  repos: 'webos:public-feed:v3:repos',
  news: 'webos:public-feed:v3:news',
  hle: 'webos:public-feed:v2:hle',
  papers: 'webos:public-feed:v2:papers',
  security: 'webos:public-feed:v2:security-advisories',
};
const LAST_REQUEST_KEY = 'webos:public-feed:v3:last-request:';

const benchmarks = [
  { name: 'Artificial Analysis', type: 'Hiệu năng, độ trễ & chi phí', description: 'So sánh mô hình theo các phép đo được công bố; hãy kiểm tra phiên bản và phương pháp chấm.', href: 'https://artificialanalysis.ai/models' },
  { name: 'LMArena Leaderboard', type: 'Bình chọn câu trả lời', description: 'Thứ hạng dựa trên đánh giá so sánh của người dùng; không đại diện cho mọi tác vụ.', href: 'https://lmarena.ai/leaderboard' },
  { name: 'Stanford HELM', type: 'Nghiên cứu & đánh giá', description: 'Khung đánh giá theo nhiều kịch bản, tiêu chí và phương pháp luận.', href: 'https://crfm.stanford.edu/helm/' },
  { name: 'Hugging Face Open LLM Leaderboard', type: 'Mô hình mở', description: 'Tham khảo kết quả trên benchmark được mô tả cụ thể; kiểm tra trạng thái hoạt động và ngày cập nhật.', href: 'https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard' },
];

const informationCollections = [
  {
    category: 'AI, mô hình & dữ liệu huấn luyện',
    description: 'Khám phá model card, dataset, kỹ thuật mới và cách các nhóm nghiên cứu đánh giá hệ thống AI.',
    sources: [
      { name: 'Hugging Face Models', description: 'Thư viện model và model card.', href: 'https://huggingface.co/models' },
      { name: 'Hugging Face Datasets', description: 'Khám phá dataset và giấy phép sử dụng.', href: 'https://huggingface.co/datasets' },
      { name: 'Papers with Code', description: 'Bài báo đi cùng benchmark và mã nguồn khi có.', href: 'https://paperswithcode.com/' },
      { name: 'Stanford HELM', description: 'Nghiên cứu đánh giá mô hình theo kịch bản.', href: 'https://crfm.stanford.edu/helm/' },
    ],
  },
  {
    category: 'Nghiên cứu khoa học',
    description: 'Nguồn tra cứu bài báo, metadata xuất bản, preprint và tài liệu khoa học.',
    sources: [
      { name: 'Europe PMC', description: 'Tìm kiếm bài báo và metadata khoa học.', href: 'https://europepmc.org/' },
      { name: 'arXiv', description: 'Preprint trong khoa học, toán học và máy tính.', href: 'https://arxiv.org/' },
      { name: 'Crossref', description: 'Metadata xuất bản và DOI.', href: 'https://www.crossref.org/' },
      { name: 'PubMed', description: 'Tìm kiếm tài liệu y sinh từ NCBI.', href: 'https://pubmed.ncbi.nlm.nih.gov/' },
    ],
  },
  {
    category: 'An ninh mạng & quyền riêng tư',
    description: 'Tra cứu cảnh báo lỗ hổng, hướng dẫn phòng thủ và khuyến nghị từ nguồn chuyên trách.',
    sources: [
      { name: 'GitHub Security Advisories', description: 'Cảnh báo bảo mật cho hệ sinh thái phần mềm.', href: 'https://github.com/advisories' },
      { name: 'CISA KEV Catalog', description: 'Danh mục lỗ hổng đã bị khai thác ngoài thực tế.', href: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog' },
      { name: 'NIST National Vulnerability Database', description: 'Tra cứu CVE và dữ liệu lỗ hổng.', href: 'https://nvd.nist.gov/' },
      { name: 'OWASP Cheat Sheet Series', description: 'Hướng dẫn thực hành bảo mật ứng dụng.', href: 'https://cheatsheetseries.owasp.org/' },
    ],
  },
  {
    category: 'Mã nguồn mở & công nghệ phát triển',
    description: 'Tìm dự án, thư viện, ngôn ngữ, công cụ và cách cộng đồng duy trì phần mềm.',
    sources: [
      { name: 'GitHub Trending', description: 'Dự án đang được chú ý trên GitHub.', href: 'https://github.com/trending' },
      { name: 'GitLab Explore', description: 'Khám phá dự án và nhóm phát triển.', href: 'https://gitlab.com/explore' },
      { name: 'Codeberg', description: 'Nền tảng lưu trữ dự án cộng đồng.', href: 'https://codeberg.org/explore' },
      { name: 'PyPI', description: 'Tra cứu gói Python và thông tin phát hành.', href: 'https://pypi.org/' },
    ],
  },
  {
    category: 'Dữ liệu mở & thống kê',
    description: 'Tìm bộ dữ liệu có nguồn gốc rõ ràng phục vụ học tập, nghiên cứu và phân tích.',
    sources: [
      { name: 'World Bank Open Data', description: 'Chỉ số phát triển và thống kê quốc tế.', href: 'https://data.worldbank.org/' },
      { name: 'Our World in Data', description: 'Bài phân tích đi kèm dữ liệu và nguồn.', href: 'https://ourworldindata.org/' },
      { name: 'UCI Machine Learning Repository', description: 'Bộ dữ liệu phục vụ học máy và giáo dục.', href: 'https://archive.ics.uci.edu/' },
      { name: 'Data.gov', description: 'Danh mục dữ liệu mở của chính phủ Hoa Kỳ.', href: 'https://data.gov/' },
    ],
  },
  {
    category: 'Tài liệu kỹ thuật & tiêu chuẩn web',
    description: 'Ưu tiên tài liệu chuẩn, nguyên bản và có hướng dẫn để kiểm chứng cách triển khai.',
    sources: [
      { name: 'MDN Web Docs', description: 'Tài liệu web về HTML, CSS và JavaScript.', href: 'https://developer.mozilla.org/' },
      { name: 'W3C Standards', description: 'Tiêu chuẩn và hướng dẫn nền tảng web.', href: 'https://www.w3.org/standards/' },
      { name: 'RFC Editor', description: 'Đặc tả giao thức Internet và tài liệu RFC.', href: 'https://www.rfc-editor.org/' },
      { name: 'WHATWG', description: 'Các tiêu chuẩn HTML và nền tảng web.', href: 'https://whatwg.org/' },
    ],
  },
  {
    category: 'Học tập & kiến thức nền',
    description: 'Tài liệu học lập trình, khoa học máy tính, toán học và các chủ đề học thuật.',
    sources: [
      { name: 'Harvard CS50', description: 'Khóa học nhập môn khoa học máy tính.', href: 'https://cs50.harvard.edu/' },
      { name: 'MIT OpenCourseWare', description: 'Tài liệu học tập công khai từ MIT.', href: 'https://ocw.mit.edu/' },
      { name: 'Khan Academy', description: 'Bài học và luyện tập nhiều môn học.', href: 'https://www.khanacademy.org/' },
      { name: 'freeCodeCamp', description: 'Lộ trình học phát triển phần mềm miễn phí.', href: 'https://www.freecodecamp.org/' },
    ],
  },
  {
    category: 'Tin công nghệ & cộng đồng',
    description: 'Đối chiếu nhiều góc nhìn, phân biệt tin biên tập với thảo luận cộng đồng.',
    sources: [
      { name: 'Hacker News', description: 'Thảo luận của cộng đồng công nghệ.', href: 'https://news.ycombinator.com/' },
      { name: 'The New Stack', description: 'Tin và phân tích về hạ tầng phần mềm.', href: 'https://thenewstack.io/' },
      { name: 'Ars Technica', description: 'Tin tức và phân tích công nghệ.', href: 'https://arstechnica.com/' },
      { name: 'ACM Queue', description: 'Bài viết chuyên sâu cho kỹ sư phần mềm.', href: 'https://queue.acm.org/' },
    ],
  },
];

function defaultFeed<T>(): FeedState<T> {
  return { items: [], savedAt: null, status: 'Đang lấy dữ liệu công khai để hiển thị ngay trên trang…' };
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
    if ((response.headers.get('content-type') || '').toLowerCase().includes('json')) {
      const payload = await response.json().catch(() => null) as { error?: unknown } | null;
      if (typeof payload?.error === 'string' && payload.error.length > 0) {
        throw new Error(payload.error.slice(0, 260));
      }
    }
    if (response.status === 429) throw new Error('Nguồn API đang giới hạn yêu cầu. Hãy đợi rồi thử lại.');
    throw new Error('API trung gian trả về HTTP ' + response.status + '.');
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
      lastModified: typeof item.lastModified === 'string' && Number.isFinite(Date.parse(item.lastModified)) ? item.lastModified.slice(0, 40) : undefined,
      tags: Array.isArray(item.tags) ? item.tags.filter((tag): tag is string => typeof tag === 'string').slice(0, 12).map((tag) => tag.slice(0, 60)) : [],
      library_name: typeof item.library_name === 'string' ? item.library_name.slice(0, 80) : undefined,
      gated: typeof item.gated === 'string' || typeof item.gated === 'boolean' ? item.gated : undefined,
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
      forks_count: typeof item.forks_count === 'number' && Number.isFinite(item.forks_count) ? Math.max(0, item.forks_count) : undefined,
      open_issues_count: typeof item.open_issues_count === 'number' && Number.isFinite(item.open_issues_count) ? Math.max(0, item.open_issues_count) : undefined,
      language: typeof item.language === 'string' ? item.language.slice(0, 60) : null,
      updated_at: typeof item.updated_at === 'string' && Number.isFinite(Date.parse(item.updated_at)) ? item.updated_at : undefined,
      created_at: typeof item.created_at === 'string' && Number.isFinite(Date.parse(item.created_at)) ? item.created_at : undefined,
      default_branch: typeof item.default_branch === 'string' ? item.default_branch.slice(0, 100) : undefined,
      topics: Array.isArray(item.topics) ? item.topics.filter((topic): topic is string => typeof topic === 'string').slice(0, 8).map((topic) => topic.slice(0, 50)) : [],
      license: item.license && typeof item.license === 'object' ? {
        name: typeof (item.license as Record<string, unknown>).name === 'string' ? ((item.license as Record<string, unknown>).name as string).slice(0, 100) : undefined,
        spdx_id: typeof (item.license as Record<string, unknown>).spdx_id === 'string' ? ((item.license as Record<string, unknown>).spdx_id as string).slice(0, 60) : undefined,
      } : null,
      archived: item.archived === true,
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
      story_text: normalizePublicFeedText(item.story_text, 2_400),
      author: typeof item.author === 'string' ? item.author.slice(0, 80) : undefined,
      points: typeof item.points === 'number' && Number.isFinite(item.points) ? Math.max(0, item.points) : undefined,
      num_comments: typeof item.num_comments === 'number' && Number.isFinite(item.num_comments) ? Math.max(0, item.num_comments) : undefined,
      created_at: typeof item.created_at === 'string' && Number.isFinite(Date.parse(item.created_at)) ? item.created_at : undefined,
    }];
  }).filter((story) => Boolean(story.title));
}

export default function PublicToolsPage() {
  const [models, setModels] = useState<FeedState<Model>>(defaultFeed);
  const [repos, setRepos] = useState<FeedState<Repository>>(defaultFeed);
  const [news, setNews] = useState<FeedState<Story>>(defaultFeed);
  const [hle, setHle] = useState<FeedState<HleLeaderboardEntry>>(defaultFeed);
  const [papers, setPapers] = useState<FeedState<EuropePmcPaper>>(defaultFeed);
  const [security, setSecurity] = useState<FeedState<PublicSecurityAdvisory>>(defaultFeed);
  const [loadingSources, setLoadingSources] = useState<SourceId[]>([]);
  const inFlightRef = useRef<Set<SourceId>>(new Set());
  const [cooldownUntil, setCooldownUntil] = useState<CooldownState>({});
  const [clockNow, setClockNow] = useState(0);
  const [storageReady, setStorageReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const cooldownUntilMax = Math.max(0, ...Object.values(cooldownUntil).filter((value): value is number => typeof value === 'number'));
  const cooldownActive = Object.values(cooldownUntil).some((until) => typeof until === 'number' && until > clockNow);

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
          const cacheStatus = 'Đang hiển thị dữ liệu đã lưu; sẽ tự kiểm tra lại sau 5 phút.';
          if (source === 'models') setModels({ items: normalizeModels(payload.items), savedAt, status: cacheStatus });
          else if (source === 'repos') setRepos({ items: normalizeRepos({ items: payload.items }), savedAt, status: cacheStatus });
          else if (source === 'news') setNews({ items: normalizeStories({ hits: payload.items }), savedAt, status: cacheStatus });
          else if (source === 'hle') setHle({ items: normalizeHleLeaderboard(payload.items), savedAt, status: cacheStatus });
          else if (source === 'papers') {
            const cached = payload.items.flatMap((entry) => {
              if (!entry || typeof entry !== 'object') return [];
              const paper = entry as Partial<EuropePmcPaper>;
              const separator = typeof paper.id === 'string' ? paper.id.indexOf(':') : -1;
              if (separator < 1) return [];
              return [{ source: paper.id!.slice(0, separator), id: paper.id!.slice(separator + 1), title: paper.title, authorString: paper.authors, journalTitle: paper.journal, pubYear: paper.year, doi: paper.doi, citedByCount: paper.citedByCount, abstractText: paper.abstract, isOpenAccess: paper.openAccess ? 'Y' : 'N' }];
            });
            setPapers({ items: normalizeEuropePmcPapers({ resultList: { result: cached } }), savedAt, status: cacheStatus });
          } else {
            const cached = payload.items.flatMap((entry) => {
              if (!entry || typeof entry !== 'object') return [];
              const advisory = entry as Partial<PublicSecurityAdvisory>;
              if (!advisory.ghsaId) return [];
              return [{ ghsa_id: advisory.ghsaId, cve_id: advisory.cveId, summary: advisory.summary, description: advisory.description, severity: advisory.severity, published_at: advisory.publishedAt, vulnerabilities: [{ package: { name: advisory.packageName, ecosystem: advisory.ecosystem }, first_patched_version: advisory.patchedVersion }] }];
            });
            setSecurity({ items: normalizeSecurityAdvisories(cached), savedAt, status: cacheStatus });
          }
        } catch {
          // Storage can be disabled or contain malformed data; page remains usable.
        }
      }
      try {
        const restoredCooldowns: CooldownState = {};
        for (const source of Object.keys(CACHE_KEYS) as SourceId[]) {
          const lastRequest = Number(window.localStorage.getItem(LAST_REQUEST_KEY + source) || '0');
          if (Number.isFinite(lastRequest) && lastRequest > 0 && lastRequest <= now) {
            const until = lastRequest + COOLDOWN_MS;
            if (until > now) restoredCooldowns[source] = until;
          }
        }
        setCooldownUntil(restoredCooldowns);
      } catch {
        // Cooldowns are best-effort when browser storage is unavailable.
      }
      setStorageReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (cooldownUntilMax <= Date.now()) return;
    const timer = window.setInterval(() => {
      const now = Date.now();
      setClockNow(now);
      if (now >= cooldownUntilMax) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownUntilMax]);

  const getFeed = useCallback(async (source: SourceId) => {
    if (inFlightRef.current.has(source)) return;
    const now = Date.now();
    const current = source === 'models' ? models : source === 'repos' ? repos : source === 'news' ? news : source === 'hle' ? hle : source === 'papers' ? papers : security;
    const updateStatus = (status: string) => {
      if (source === 'models') setModels((previous) => ({ ...previous, status }));
      else if (source === 'repos') setRepos((previous) => ({ ...previous, status }));
      else if (source === 'news') setNews((previous) => ({ ...previous, status }));
      else if (source === 'hle') setHle((previous) => ({ ...previous, status }));
      else if (source === 'papers') setPapers((previous) => ({ ...previous, status }));
      else setSecurity((previous) => ({ ...previous, status }));
    };
    if (current.savedAt && now - current.savedAt < CACHE_MS && current.items.length) {
      const freshStatus = 'Đang hiển thị dữ liệu đã lưu; nguồn sẽ được kiểm tra lại khi cache 5 phút hết hạn.';
      if (current.status !== freshStatus) updateStatus(freshStatus);
      return;
    }
    const sourceCooldownUntil = cooldownUntil[source] ?? 0;
    if (now < sourceCooldownUntil) {
      updateStatus('Nguồn này đang có cooldown. Hãy thử lại sau ' + Math.ceil((sourceCooldownUntil - now) / 1000) + ' giây; các nguồn khác vẫn có thể sử dụng.');
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10_000);
    const requestAt = Date.now();
    inFlightRef.current.add(source);
    setLoadingSources(Array.from(inFlightRef.current));
    setClockNow(requestAt);
    setCooldownUntil((previous) => ({ ...previous, [source]: requestAt + COOLDOWN_MS }));
    updateStatus('Đang lấy dữ liệu qua API của website…');
    try { window.localStorage.setItem(LAST_REQUEST_KEY + source, String(requestAt)); }
    catch { /* In-memory throttling remains active for this page session. */ }

    try {
      const response = await fetch('/api/public/explore?source=' + encodeURIComponent(source), {
        method: 'GET', signal: controller.signal,
        headers: { Accept: 'application/json' },
        cache: 'no-store', credentials: 'same-origin', redirect: 'error', referrerPolicy: 'no-referrer',
      });
      const payload = await readJsonLimited<unknown>(response);
      const normalized = source === 'models' ? normalizeModels(payload)
        : source === 'repos' ? normalizeRepos(payload)
        : source === 'news' ? normalizeStories(payload)
        : source === 'hle' ? normalizeHleLeaderboard(payload)
        : source === 'papers' ? normalizeEuropePmcPapers(payload)
        : normalizeSecurityAdvisories(payload);
      const savedAt = Date.now();
      const status = normalized.length
        ? 'Đã tải ' + normalized.length + ' mục. Dữ liệu chỉ mang tính tham khảo, không phải bảo chứng chất lượng.'
        : 'Nguồn API không trả về kết quả công khai phù hợp.';
      if (source === 'models') setModels({ items: normalized as Model[], savedAt, status });
      else if (source === 'repos') setRepos({ items: normalized as Repository[], savedAt, status });
      else if (source === 'news') setNews({ items: normalized as Story[], savedAt, status });
      else if (source === 'hle') setHle({ items: normalized as HleLeaderboardEntry[], savedAt, status });
      else if (source === 'papers') setPapers({ items: normalized as EuropePmcPaper[], savedAt, status });
      else setSecurity({ items: normalized as PublicSecurityAdvisory[], savedAt, status });
      try { window.localStorage.setItem(CACHE_KEYS[source], JSON.stringify({ savedAt, items: normalized })); }
      catch { /* Keep results in memory when storage is unavailable. */ }
    } catch (cause) {
      updateStatus(cause instanceof Error && cause.name === 'AbortError'
        ? 'Nguồn phản hồi quá chậm; đã hủy yêu cầu sau 10 giây.'
        : cause instanceof Error ? cause.message : 'Không thể tải dữ liệu lúc này.');
    } finally {
      window.clearTimeout(timeout);
      inFlightRef.current.delete(source);
      setLoadingSources(Array.from(inFlightRef.current));
    }
  }, [cooldownUntil, models, news, repos, hle, papers, security]);

  const getFeedRef = useRef(getFeed);
  useEffect(() => {
    getFeedRef.current = getFeed;
  }, [getFeed]);

  // Fetch every public feed automatically after cache hydration. Each source has
  // independent loading state, while the server route caches upstream responses.
  useEffect(() => {
    if (!storageReady) return;
    for (const source of Object.keys(CACHE_KEYS) as SourceId[]) {
      void getFeedRef.current(source);
    }
  }, [storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    const refreshTimer = window.setInterval(() => {
      for (const source of Object.keys(CACHE_KEYS) as SourceId[]) {
        void getFeedRef.current(source);
      }
    }, REFRESH_CHECK_MS);
    return () => window.clearInterval(refreshTimer);
  }, [storageReady]);

  const currentFeed = (source: SourceId): FeedState<unknown> =>
    source === 'models' ? models : source === 'repos' ? repos : source === 'news' ? news : source === 'hle' ? hle : source === 'papers' ? papers : security;

  const disabled = (source: SourceId): boolean => {
    const current = currentFeed(source);
    const isFresh = typeof current.savedAt === 'number' && clockNow >= current.savedAt && clockNow - current.savedAt < CACHE_MS;
    return !storageReady || loadingSources.includes(source) || ((cooldownUntil[source] ?? 0) > clockNow && !isFresh) || (isFresh && current.items.length > 0);
  };

  const searchTerm = searchQuery.trim().toLocaleLowerCase();
  const matches = (value: string): boolean => !searchTerm || value.toLocaleLowerCase().includes(searchTerm);
  const visibleModels = models.items.filter((item) => matches([item.id, item.pipeline_tag, ...(item.tags ?? [])].join(' ')));
  const visibleRepos = repos.items.filter((item) => matches([item.full_name, item.description, item.language, item.license?.name, ...(item.topics ?? [])].filter(Boolean).join(' ')));
  const visibleNews = news.items.filter((item) => matches([item.title, item.story_text, item.author].filter(Boolean).join(' ')));
  const visibleHle = hle.items.filter((item) => matches([item.modelId, item.notes].filter(Boolean).join(' ')));
  const visiblePapers = papers.items.filter((item) => matches([item.title, item.authors, item.journal, item.abstract].filter(Boolean).join(' ')));
  const visibleSecurity = security.items.filter((item) => matches([item.ghsaId, item.cveId, item.summary, item.description, item.packageName, item.ecosystem].filter(Boolean).join(' ')));
  const totalRecords = models.items.length + repos.items.length + news.items.length + hle.items.length + papers.items.length + security.items.length;
  const visibleRecords = visibleModels.length + visibleRepos.length + visibleNews.length + visibleHle.length + visiblePapers.length + visibleSecurity.length;

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
          <h1 className="max-w-4xl text-3xl font-serif font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl md:text-5xl">Bản đồ tri thức số: AI, khoa học, bảo mật và dữ liệu mở.</h1>
          <p className="max-w-3xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">Một cổng thông tin để đọc, khám phá và đối chiếu kiến thức từ nguồn gốc: mô hình AI, nghiên cứu khoa học, mã nguồn mở, an ninh mạng, dữ liệu công cộng, tiêu chuẩn kỹ thuật và tài liệu học tập. Không cần tài khoản, không tải phần mềm chỉ để xem thông tin.</p>
          <div className="flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
            <span className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2">01 · AI & Benchmarks</span>
            <span className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2">02 · Khoa học & bài báo</span>
            <span className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2">03 · An ninh mạng</span>
            <span className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2">04 · Mã nguồn mở</span>
            <span className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2">05 · Dữ liệu & học tập</span>
          </div>
        </div>
      </section>

      {cooldownActive && (
        <div role="status" className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface-subtle)] px-4 py-3 text-xs text-[var(--text-secondary)]">
          Đang cập nhật hoặc kiểm tra lại nguồn dữ liệu. Các bản ghi đã có vẫn được giữ trên trang trong lúc nguồn bên ngoài phản hồi.
        </div>
      )}

      <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-mono uppercase tracking-wide text-[var(--accent)]"><Search size={14} /> EXPLORE LIVE DATA</div>
            <h2 className="text-xl font-serif font-bold text-[var(--text-primary)]">Dữ liệu được trình bày ngay tại đây</h2>
            <p className="mt-1 max-w-2xl text-xs leading-6 text-[var(--text-secondary)]">Sáu nguồn dữ liệu công khai được nạp tự động, chuẩn hóa và lưu cache ở máy chủ. Bạn có thể tìm kiếm và mở phần chi tiết mà không cần tải tệp hay rời khỏi trang.</p>
          </div>
          <div className="rounded-xl border border-[var(--border-color)] px-4 py-3">
            <div className="text-2xl font-bold tabular-nums text-[var(--text-primary)]">{formatNumber(totalRecords)}</div>
            <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Bản ghi đã nạp</div>
          </div>
        </div>
        <label htmlFor="explore-live-search" className="mt-5 block text-xs font-semibold text-[var(--text-secondary)]">Tìm trong mô hình, dự án, bài viết, benchmark, nghiên cứu và cảnh báo</label>
        <div className="relative mt-2">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input id="explore-live-search" type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Ví dụ: Qwen, reasoning, CVE, open access…" className="min-h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-page)] py-2 pl-10 pr-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)]" />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[var(--text-muted)]">
          <span aria-live="polite">{searchTerm ? `Tìm thấy ${formatNumber(visibleRecords)} / ${formatNumber(totalRecords)} mục phù hợp` : 'Kết quả được trình bày tại chỗ; chọn “Xem chi tiết” trên từng thẻ để đọc thêm.'}</span>
          {searchQuery && <button type="button" onClick={() => setSearchQuery('')} className="rounded-lg border border-[var(--border-color)] px-3 py-1.5 hover:bg-[var(--bg-surface-subtle)]">Xóa tìm kiếm</button>}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <article className="min-w-0 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 sm:p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div><div className="mb-1 flex items-center gap-2 text-xs font-mono uppercase tracking-wide text-[var(--accent)]"><Sparkles size={14} /> MODEL RADAR</div><h2 className="text-lg font-serif font-bold">Mô hình AI</h2></div>
            <a href="https://huggingface.co/models" target="_blank" rel="noopener noreferrer" aria-label="Mở Hugging Face Hub" className="rounded-lg border border-[var(--border-color)] p-2 text-[var(--text-muted)] hover:text-[var(--accent)]"><ExternalLink size={14} /></a>
          </div>
          <p className="mb-4 text-xs leading-5 text-[var(--text-secondary)]">Tối đa 8 mô hình tạo văn bản phổ biến trên Hub. Lượt tải và lượt thích đo mức độ quan tâm, không phải benchmark.</p>
          <button type="button" onClick={() => getFeed('models')} disabled={disabled('models')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50">{loadingSources.includes('models') ? <LoaderCircle size={14} className="animate-spin" /> : <Sparkles size={14} />}{loadingSources.includes('models') ? 'Đang lấy dữ liệu…' : models.items.length ? 'Đã hiển thị ngay trên trang' : 'Thử lại nguồn dữ liệu'}</button>
          <p className="mt-3 min-h-10 text-[11px] leading-5 text-[var(--text-muted)]" aria-live="polite">{models.status}</p>
          {models.savedAt && <p className="mb-2 text-[10px] text-[var(--text-muted)]">Cập nhật {new Date(models.savedAt).toLocaleString('vi-VN')} · cache 5 phút</p>}
          <div className="space-y-2">
            {visibleModels.map((model) => {
              const itemKey = 'model:' + model.id;
              const isExpanded = expandedItem === itemKey;
              return (
                <article key={model.id} className="rounded-xl border border-[var(--border-color)] p-3 transition hover:border-[var(--border-focus)]">
                  <button type="button" onClick={() => setExpandedItem(isExpanded ? null : itemKey)} aria-expanded={isExpanded} className="flex w-full items-start justify-between gap-3 text-left">
                    <span className="min-w-0"><strong className="block break-all text-xs text-[var(--text-primary)]">{model.id}</strong><span className="mt-1 block text-[10px] text-[var(--text-secondary)]">{model.pipeline_tag || 'Mô hình trên Hugging Face Hub'}{model.library_name ? ' · ' + model.library_name : ''}</span></span>
                    {isExpanded ? <ChevronUp size={16} className="shrink-0 text-[var(--accent)]" /> : <ChevronDown size={16} className="shrink-0 text-[var(--text-muted)]" />}
                  </button>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[var(--text-muted)]"><span>Lượt tải: {formatNumber(model.downloads)}</span><span>Lượt thích: {formatNumber(model.likes)}</span>{model.gated === true || model.gated === 'auto' ? <span>Có giới hạn truy cập</span> : null}</div>
                  {isExpanded && <div className="mt-3 space-y-2 border-t border-[var(--border-color)] pt-3 text-xs leading-5 text-[var(--text-secondary)]">
                    <p><strong>Loại tác vụ:</strong> {model.pipeline_tag || 'Chưa có nhãn tác vụ'}</p>
                    <p><strong>Thư viện:</strong> {model.library_name || 'Không công bố'} · <strong>Cập nhật:</strong> {model.lastModified ? new Date(model.lastModified).toLocaleDateString('vi-VN') : 'Chưa rõ'}</p>
                    {model.tags?.length ? <div className="flex flex-wrap gap-1.5">{model.tags.slice(0, 8).map((tag) => <span key={tag} className="rounded-md border border-[var(--border-color)] px-2 py-1 text-[10px]">{tag}</span>)}</div> : null}
                    <p className="text-[10px] text-[var(--text-muted)]">Lượt tải và yêu thích chỉ phản ánh mức độ sử dụng, không phải phép đo chất lượng hay độ chính xác.</p>
                    <a href={'https://huggingface.co/' + model.id.split('/').map(encodeURIComponent).join('/')} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-[var(--accent)] hover:underline">Xem model card gốc <ExternalLink size={12} /></a>
                  </div>}
                </article>
              );
            })}
            {!models.items.length && <p className="rounded-xl border border-dashed border-[var(--border-color)] p-4 text-xs text-[var(--text-muted)]">{loadingSources.includes('models') ? 'Đang nạp danh sách mô hình…' : models.status}</p>}
            {models.items.length > 0 && visibleModels.length === 0 && <p className="text-xs text-[var(--text-muted)]">Không có mô hình nào khớp bộ lọc hiện tại.</p>}
          </div>
          <p className="mt-4 text-[10px] leading-5 text-[var(--text-muted)]">Nguồn dữ liệu: Hugging Face Hub API. Website tải dữ liệu công khai qua API trung gian có cache để khách không phải mở API gốc.</p>
        </article>

        <article className="min-w-0 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 sm:p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div><div className="mb-1 flex items-center gap-2 text-xs font-mono uppercase tracking-wide text-[var(--accent)]"><Code2 size={14} /> OPEN-SOURCE RADAR</div><h2 className="text-lg font-serif font-bold">Dự án AI mã nguồn mở</h2></div>
            <a href="https://github.com/topics/llm" target="_blank" rel="noopener noreferrer" aria-label="Mở GitHub LLM topic" className="rounded-lg border border-[var(--border-color)] p-2 text-[var(--text-muted)] hover:text-[var(--accent)]"><ExternalLink size={14} /></a>
          </div>
          <p className="mb-4 text-xs leading-5 text-[var(--text-secondary)]">Tối đa 8 repository theo chủ đề LLM, sắp xếp theo sao. Số sao không đồng nghĩa với an toàn hoặc chất lượng.</p>
          <button type="button" onClick={() => getFeed('repos')} disabled={disabled('repos')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50">{loadingSources.includes('repos') ? <LoaderCircle size={14} className="animate-spin" /> : <Sparkles size={14} />}{loadingSources.includes('repos') ? 'Đang lấy dữ liệu…' : repos.items.length ? 'Đã hiển thị ngay trên trang' : 'Thử lại nguồn dữ liệu'}</button>
          <p className="mt-3 min-h-10 text-[11px] leading-5 text-[var(--text-muted)]" aria-live="polite">{repos.status}</p>
          {repos.savedAt && <p className="mb-2 text-[10px] text-[var(--text-muted)]">Cập nhật {new Date(repos.savedAt).toLocaleString('vi-VN')} · cache 5 phút</p>}
          <div className="space-y-2">
            {visibleRepos.map((repo) => {
              const itemKey = 'repo:' + repo.full_name;
              const isExpanded = expandedItem === itemKey;
              return (
                <article key={repo.full_name} className="rounded-xl border border-[var(--border-color)] p-3 transition hover:border-[var(--border-focus)]">
                  <button type="button" onClick={() => setExpandedItem(isExpanded ? null : itemKey)} aria-expanded={isExpanded} className="flex w-full items-start justify-between gap-3 text-left">
                    <span className="min-w-0"><strong className="block break-all text-xs text-[var(--text-primary)]">{repo.full_name}</strong>{repo.description && <span className="mt-1 block line-clamp-2 text-[11px] leading-5 text-[var(--text-secondary)]">{repo.description}</span>}</span>
                    {isExpanded ? <ChevronUp size={16} className="shrink-0 text-[var(--accent)]" /> : <ChevronDown size={16} className="shrink-0 text-[var(--text-muted)]" />}
                  </button>
                  <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[var(--text-muted)]"><span className="inline-flex items-center gap-1"><Star size={10} /> {formatNumber(repo.stargazers_count)} sao</span><span>Fork: {formatNumber(repo.forks_count)}</span>{repo.language && <span>{repo.language}</span>}{repo.license?.spdx_id && repo.license.spdx_id !== 'NOASSERTION' ? <span>Giấy phép: {repo.license.spdx_id}</span> : null}{repo.archived ? <span className="text-amber-700 dark:text-amber-300">Đã lưu trữ</span> : null}</div>
                  {isExpanded && <div className="mt-3 space-y-2 border-t border-[var(--border-color)] pt-3 text-xs leading-5 text-[var(--text-secondary)]">
                    <p>{repo.description || 'Dự án chưa cung cấp mô tả.'}</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3"><div className="rounded-lg bg-[var(--bg-surface-subtle)] p-2"><strong className="block text-base text-[var(--text-primary)]">{formatNumber(repo.open_issues_count)}</strong><span className="text-[10px]">Issues mở</span></div><div className="rounded-lg bg-[var(--bg-surface-subtle)] p-2"><strong className="block text-base text-[var(--text-primary)]">{formatNumber(repo.forks_count)}</strong><span className="text-[10px]">Forks</span></div><div className="rounded-lg bg-[var(--bg-surface-subtle)] p-2"><strong className="block text-base text-[var(--text-primary)]">{repo.default_branch || '—'}</strong><span className="text-[10px]">Nhánh mặc định</span></div></div>
                    <p><strong>Tạo:</strong> {repo.created_at ? new Date(repo.created_at).toLocaleDateString('vi-VN') : 'Không rõ'} · <strong>Cập nhật gần nhất:</strong> {repo.updated_at ? new Date(repo.updated_at).toLocaleDateString('vi-VN') : 'Không rõ'}</p>
                    {repo.topics?.length ? <div className="flex flex-wrap gap-1.5">{repo.topics.map((topic) => <span key={topic} className="rounded-md border border-[var(--border-color)] px-2 py-1 text-[10px]">{topic}</span>)}</div> : null}
                    {repo.license?.name && <p><strong>Giấy phép:</strong> {repo.license.name}</p>}
                    <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-[var(--accent)] hover:underline">Mở repository gốc <ExternalLink size={12} /></a>
                  </div>}
                </article>
              );
            })}
            {!repos.items.length && <p className="rounded-xl border border-dashed border-[var(--border-color)] p-4 text-xs text-[var(--text-muted)]">{loadingSources.includes('repos') ? 'Đang nạp dự án mã nguồn mở…' : repos.status}</p>}
            {repos.items.length > 0 && visibleRepos.length === 0 && <p className="text-xs text-[var(--text-muted)]">Không có dự án nào khớp bộ lọc hiện tại.</p>}
          </div>
          <p className="mt-4 text-[10px] leading-5 text-[var(--text-muted)]">Nguồn dữ liệu: GitHub Search API. Bản ghi đã được lọc và trình bày trực tiếp; liên kết repo gốc chỉ dành cho ai muốn kiểm tra thêm.</p>
        </article>

        <article className="min-w-0 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 sm:p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div><div className="mb-1 flex items-center gap-2 text-xs font-mono uppercase tracking-wide text-[var(--accent)]"><Newspaper size={14} /> TECH SIGNALS</div><h2 className="text-lg font-serif font-bold">Tin & thảo luận AI</h2></div>
            <a href="https://news.ycombinator.com/" target="_blank" rel="noopener noreferrer" aria-label="Mở Hacker News" className="rounded-lg border border-[var(--border-color)] p-2 text-[var(--text-muted)] hover:text-[var(--accent)]"><ExternalLink size={14} /></a>
          </div>
          <p className="mb-4 text-xs leading-5 text-[var(--text-secondary)]">Các câu chuyện gần đây khớp từ khóa AI model trên Hacker News, tối đa 8 mục. Đây là luồng thảo luận, không phải tin tức đã được biên tập xác minh.</p>
          <button type="button" onClick={() => getFeed('news')} disabled={disabled('news')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50">{loadingSources.includes('news') ? <LoaderCircle size={14} className="animate-spin" /> : <Sparkles size={14} />}{loadingSources.includes('news') ? 'Đang lấy dữ liệu…' : news.items.length ? 'Đã hiển thị ngay trên trang' : 'Thử lại nguồn dữ liệu'}</button>
          <p className="mt-3 min-h-10 text-[11px] leading-5 text-[var(--text-muted)]" aria-live="polite">{news.status}</p>
          {news.savedAt && <p className="mb-2 text-[10px] text-[var(--text-muted)]">Cập nhật {new Date(news.savedAt).toLocaleString('vi-VN')} · cache 5 phút</p>}
          <div className="space-y-2">
            {visibleNews.map((story) => {
              const itemKey = 'news:' + story.objectID;
              const isExpanded = expandedItem === itemKey;
              return <article key={story.objectID} className="rounded-xl border border-[var(--border-color)] p-3">
                <button type="button" onClick={() => setExpandedItem(isExpanded ? null : itemKey)} aria-expanded={isExpanded} className="flex w-full items-start justify-between gap-3 text-left">
                  <span className="text-xs font-semibold leading-5 text-[var(--text-primary)]">{story.title}</span>
                  {isExpanded ? <ChevronUp size={15} className="shrink-0 text-[var(--accent)]" /> : <ChevronDown size={15} className="shrink-0 text-[var(--text-muted)]" />}
                </button>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[var(--text-muted)]"><span>Điểm: {formatNumber(story.points)}</span><span>Bình luận: {formatNumber(story.num_comments)}</span>{story.author && <span>Tác giả: {story.author}</span>}{story.created_at && <span>{new Date(story.created_at).toLocaleDateString('vi-VN')}</span>}</div>
                {isExpanded && <div className="mt-3 space-y-2 border-t border-[var(--border-color)] pt-3 text-xs leading-5 text-[var(--text-secondary)]">
                  {story.story_text ? <p className="whitespace-pre-wrap break-words">{story.story_text}</p> : <p>Bản ghi nguồn hiện chỉ cung cấp tiêu đề và số liệu thảo luận.</p>}
                  {story.url && <a href={story.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-[var(--accent)] hover:underline">Mở bài viết hoặc thảo luận gốc <ExternalLink size={12} /></a>}
                </div>}
              </article>;
            })}
            {!news.items.length && <p className="rounded-xl border border-dashed border-[var(--border-color)] p-4 text-xs text-[var(--text-muted)]">{loadingSources.includes('news') ? 'Đang nạp bài viết…' : news.status}</p>}
            {news.items.length > 0 && visibleNews.length === 0 && <p className="text-xs text-[var(--text-muted)]">Không có nội dung nào khớp bộ lọc hiện tại.</p>}
          </div>
          <p className="mt-4 text-[10px] leading-5 text-[var(--text-muted)]">Nguồn dữ liệu: Hacker News Search API qua API trung gian của website.</p>
        </article>

        <article className="min-w-0 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 sm:p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div><div className="mb-1 flex items-center gap-2 text-xs font-mono uppercase tracking-wide text-[var(--accent)]"><Trophy size={14} /> LIVE BENCHMARK</div><h2 className="text-lg font-serif font-bold">Humanity&apos;s Last Exam (HLE)</h2></div>
            <a href="https://huggingface.co/datasets/cais/hle/leaderboard" target="_blank" rel="noopener noreferrer" aria-label="Mở HLE leaderboard gốc" className="rounded-lg border border-[var(--border-color)] p-2 text-[var(--text-muted)] hover:text-[var(--accent)]"><ExternalLink size={14} /></a>
          </div>
          <p className="mb-4 text-xs leading-5 text-[var(--text-secondary)]">Điểm và thứ hạng từ leaderboard công khai của Hugging Face. Tải tối đa 8 dòng; giữ nguyên nhãn xác minh và ghi chú tác vụ, không tự quy đổi điểm thành phần trăm.</p>
          <button type="button" onClick={() => getFeed('hle')} disabled={disabled('hle')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50">{loadingSources.includes('hle') ? <LoaderCircle size={14} className="animate-spin" /> : <Sparkles size={14} />}{loadingSources.includes('hle') ? 'Đang lấy dữ liệu…' : hle.items.length ? 'Đã hiển thị ngay trên trang' : 'Thử lại nguồn dữ liệu'}</button>
          <p className="mt-3 min-h-10 text-[11px] leading-5 text-[var(--text-muted)]" aria-live="polite">{hle.status}</p>
          {hle.savedAt && <p className="mb-2 text-[10px] text-[var(--text-muted)]">Cập nhật {new Date(hle.savedAt).toLocaleString('vi-VN')} · cache cục bộ 5 phút</p>}
          <div className="space-y-2">
            {visibleHle.map((entry) => {
              const itemKey = 'hle:' + entry.modelId;
              const isExpanded = expandedItem === itemKey;
              return <div key={entry.modelId} className="rounded-xl border border-[var(--border-color)] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><span className="text-[10px] font-mono text-[var(--accent)]">Hạng #{entry.rank}</span><p className="mt-1 break-all text-xs font-semibold text-[var(--text-primary)]">{entry.modelId}</p></div>
                  <div className="shrink-0 text-right"><div className="text-xl font-bold tabular-nums text-[var(--text-primary)]">{new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(entry.value)}</div><div className="text-[9px] uppercase tracking-wide text-[var(--text-muted)]">Điểm HLE</div></div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                  <span className={entry.verified ? 'rounded-md border border-emerald-500/30 bg-emerald-500/5 px-2 py-1 text-emerald-700 dark:text-emerald-300' : 'rounded-md border border-amber-500/30 bg-amber-500/5 px-2 py-1 text-amber-700 dark:text-amber-300'}>{entry.verified ? 'Đã xác minh' : 'Chưa xác minh độc lập'}</span>
                  {entry.numParameters && <span className="rounded-md border border-[var(--border-color)] px-2 py-1 text-[var(--text-muted)]">Tham số: {formatNumber(entry.numParameters)}</span>}
                </div>
                {entry.notes && <p className="mt-2 text-[10px] leading-5 text-[var(--text-secondary)]">Ghi chú benchmark: {entry.notes}</p>}
                <button type="button" onClick={() => setExpandedItem(isExpanded ? null : itemKey)} aria-expanded={isExpanded} className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--accent)] hover:underline">{isExpanded ? 'Ẩn phương pháp' : 'Xem diễn giải'} {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}</button>
                {isExpanded && <div className="mt-2 space-y-1 border-t border-[var(--border-color)] pt-2 text-[10px] leading-5 text-[var(--text-secondary)]"><p>Điểm được giữ nguyên theo dữ liệu leaderboard gốc; không tự quy đổi thành phần trăm.</p><p>Đối chiếu nhãn xác minh và ghi chú trước khi xếp hạng các mô hình.</p><a href={'https://huggingface.co/' + entry.modelId.split('/').map(encodeURIComponent).join('/')} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-[var(--accent)] hover:underline">Model card gốc <ExternalLink size={12} /></a></div>}
              </div>;
            })}
          </div>
          <p className="mt-4 text-[10px] leading-5 text-[var(--text-muted)]">Nguồn: <a className="underline" href="https://huggingface.co/docs/hub/leaderboard-data-guide" target="_blank" rel="noopener noreferrer">Hugging Face Leaderboard API</a>. Một số điểm do cộng đồng gửi lên; hãy xem nhãn xác minh và ghi chú trước khi so sánh.</p>
        </article>

        <article className="min-w-0 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 sm:p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div><div className="mb-1 flex items-center gap-2 text-xs font-mono uppercase tracking-wide text-[var(--accent)]"><BookOpen size={14} /> RESEARCH RADAR</div><h2 className="text-lg font-serif font-bold">Nghiên cứu khoa học mới</h2></div>
            <a href="https://europepmc.org/" target="_blank" rel="noopener noreferrer" aria-label="Mở Europe PMC" className="rounded-lg border border-[var(--border-color)] p-2 text-[var(--text-muted)] hover:text-[var(--accent)]"><ExternalLink size={14} /></a>
          </div>
          <p className="mb-4 text-xs leading-5 text-[var(--text-secondary)]">Bài báo liên quan đến trí tuệ nhân tạo và mô hình ngôn ngữ từ Europe PMC. Đây là metadata thư mục; quyền đọc toàn văn phụ thuộc từng bài và giấy phép.</p>
          <button type="button" onClick={() => getFeed('papers')} disabled={disabled('papers')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50">{loadingSources.includes('papers') ? <LoaderCircle size={14} className="animate-spin" /> : <Sparkles size={14} />}{loadingSources.includes('papers') ? 'Đang lấy dữ liệu…' : papers.items.length ? 'Đã hiển thị ngay trên trang' : 'Thử lại nguồn dữ liệu'}</button>
          <p className="mt-3 min-h-10 text-[11px] leading-5 text-[var(--text-muted)]" aria-live="polite">{papers.status}</p>
          {papers.savedAt && <p className="mb-2 text-[10px] text-[var(--text-muted)]">Cập nhật {new Date(papers.savedAt).toLocaleString('vi-VN')} · cache 5 phút</p>}
          <div className="space-y-2">
            {visiblePapers.map((paper) => {
              const itemKey = 'paper:' + paper.id;
              const isExpanded = expandedItem === itemKey;
              return <article key={paper.id} className="rounded-xl border border-[var(--border-color)] p-3">
                <button type="button" onClick={() => setExpandedItem(isExpanded ? null : itemKey)} aria-expanded={isExpanded} className="flex w-full items-start justify-between gap-3 text-left">
                  <span className="text-xs font-semibold leading-5 text-[var(--text-primary)]">{paper.title}</span>
                  {isExpanded ? <ChevronUp size={15} className="shrink-0 text-[var(--accent)]" /> : <ChevronDown size={15} className="shrink-0 text-[var(--text-muted)]" />}
                </button>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[var(--text-muted)]">
                  {paper.year && <span>{paper.year}</span>}{paper.journal && <span>{paper.journal}</span>}{paper.citedByCount !== undefined && <span>Trích dẫn: {formatNumber(paper.citedByCount)}</span>}
                  {paper.openAccess && <span className="rounded-md border border-emerald-500/30 px-1.5 py-0.5 text-emerald-700 dark:text-emerald-300">Open Access</span>}
                </div>
                {paper.authors && <p className="mt-2 text-[10px] leading-5 text-[var(--text-secondary)]">{paper.authors}</p>}
                {isExpanded && <div className="mt-3 space-y-2 border-t border-[var(--border-color)] pt-3 text-xs leading-5 text-[var(--text-secondary)]">
                  {paper.abstract ? <p className="whitespace-pre-wrap break-words">{paper.abstract}</p> : <p>Nguồn dữ liệu hiện không cung cấp tóm tắt cho bài này. Thông tin thư mục vẫn hiển thị phía trên.</p>}
                  {paper.doi && <p>DOI: <a href={'https://doi.org/' + encodeURIComponent(paper.doi)} target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--accent)]">{paper.doi}</a></p>}
                  <a href={paper.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-[var(--accent)] hover:underline">Nguồn nghiên cứu gốc <ExternalLink size={12} /></a>
                </div>}
              </article>;
            })}
            {!papers.items.length && <p className="rounded-xl border border-dashed border-[var(--border-color)] p-4 text-xs text-[var(--text-muted)]">{loadingSources.includes('papers') ? 'Đang tải metadata và tóm tắt bài báo…' : papers.status}</p>}
            {papers.items.length > 0 && visiblePapers.length === 0 && <p className="text-xs text-[var(--text-muted)]">Không có bài nghiên cứu nào khớp bộ lọc.</p>}
          </div>
          <p className="mt-4 text-[10px] leading-5 text-[var(--text-muted)]">Nguồn dữ liệu: Europe PMC REST API. Tóm tắt được hiển thị tại chỗ khi API cung cấp; toàn văn vẫn phụ thuộc giấy phép của bài báo.</p>
        </article>

        <article className="min-w-0 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 sm:p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div><div className="mb-1 flex items-center gap-2 text-xs font-mono uppercase tracking-wide text-[var(--accent)]"><ShieldCheck size={14} /> SECURITY RADAR</div><h2 className="text-lg font-serif font-bold">Cảnh báo bảo mật phần mềm</h2></div>
            <a href="https://github.com/advisories" target="_blank" rel="noopener noreferrer" aria-label="Mở GitHub Security Advisories" className="rounded-lg border border-[var(--border-color)] p-2 text-[var(--text-muted)] hover:text-[var(--accent)]"><ExternalLink size={14} /></a>
          </div>
          <p className="mb-4 text-xs leading-5 text-[var(--text-secondary)]">Cảnh báo lỗ hổng công khai đã được GitHub xem xét, hữu ích khi theo dõi thư viện và chuỗi cung ứng phần mềm. Không thay thế quy trình đánh giá rủi ro của dự án.</p>
          <button type="button" onClick={() => getFeed('security')} disabled={disabled('security')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50">{loadingSources.includes('security') ? <LoaderCircle size={14} className="animate-spin" /> : <Sparkles size={14} />}{loadingSources.includes('security') ? 'Đang lấy dữ liệu…' : security.items.length ? 'Đã hiển thị ngay trên trang' : 'Thử lại nguồn dữ liệu'}</button>
          <p className="mt-3 min-h-10 text-[11px] leading-5 text-[var(--text-muted)]" aria-live="polite">{security.status}</p>
          {security.savedAt && <p className="mb-2 text-[10px] text-[var(--text-muted)]">Cập nhật {new Date(security.savedAt).toLocaleString('vi-VN')} · cache 5 phút</p>}
          <div className="space-y-2">
            {visibleSecurity.map((advisory) => {
              const itemKey = 'security:' + advisory.ghsaId;
              const isExpanded = expandedItem === itemKey;
              return <article key={advisory.ghsaId} className="rounded-xl border border-[var(--border-color)] p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <button type="button" onClick={() => setExpandedItem(isExpanded ? null : itemKey)} aria-expanded={isExpanded} className="min-w-0 flex-1 text-left text-xs font-semibold leading-5 text-[var(--text-primary)] hover:text-[var(--accent)]">{advisory.summary}</button>
                  <span className={advisory.severity === 'critical' || advisory.severity === 'high' ? 'rounded-md border border-red-500/30 px-2 py-1 text-[9px] font-semibold uppercase text-red-700 dark:text-red-300' : 'rounded-md border border-[var(--border-color)] px-2 py-1 text-[9px] font-semibold uppercase text-[var(--text-muted)]'}>{advisory.severity || 'unknown'}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[var(--text-muted)]"><span>{advisory.ghsaId}</span>{advisory.cveId && <span>{advisory.cveId}</span>}{advisory.publishedAt && <span>{new Date(advisory.publishedAt).toLocaleDateString('vi-VN')}</span>}</div>
                {advisory.packageName && <p className="mt-2 text-[10px] text-[var(--text-muted)]">Gói: {advisory.packageName}{advisory.ecosystem ? ' · ' + advisory.ecosystem : ''}{advisory.patchedVersion ? ' · Bản sửa: ' + advisory.patchedVersion : ''}</p>}
                {isExpanded && <div className="mt-3 space-y-2 border-t border-[var(--border-color)] pt-3 text-xs leading-5 text-[var(--text-secondary)]">
                  <p className="whitespace-pre-wrap break-words">{advisory.description || 'Nguồn chỉ cung cấp tiêu đề cảnh báo và metadata cho bản ghi này.'}</p>
                  <p><strong>Mã cảnh báo:</strong> {advisory.ghsaId}{advisory.cveId ? ' · ' + advisory.cveId : ''}</p>
                  <p><strong>Mức độ:</strong> {advisory.severity || 'unknown'} · Hãy đánh giá trong ngữ cảnh phiên bản và cách sử dụng gói phụ thuộc.</p>
                  <a href={advisory.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-[var(--accent)] hover:underline">Xem cảnh báo gốc <ExternalLink size={12} /></a>
                </div>}
              </article>;
            })}
            {!security.items.length && <p className="rounded-xl border border-dashed border-[var(--border-color)] p-4 text-xs text-[var(--text-muted)]">{loadingSources.includes('security') ? 'Đang nạp cảnh báo bảo mật…' : security.status}</p>}
            {security.items.length > 0 && visibleSecurity.length === 0 && <p className="text-xs text-[var(--text-muted)]">Không có cảnh báo nào khớp bộ lọc hiện tại.</p>}
          </div>
          <p className="mt-4 text-[10px] leading-5 text-[var(--text-muted)]">Nguồn: <a className="underline" href="https://docs.github.com/en/rest/security-advisories/global-advisories" target="_blank" rel="noopener noreferrer">GitHub Global Security Advisories API</a>. Chỉ hiển thị thông tin công khai mà nguồn cung cấp.</p>
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

      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--border-color)] pb-4">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-mono uppercase tracking-wide text-[var(--accent)]"><BookOpen size={14} /> KNOWLEDGE DIRECTORY</div>
            <h2 className="text-2xl font-serif font-bold text-[var(--text-primary)]">Khám phá theo lĩnh vực</h2>
            <p className="mt-1 max-w-3xl text-xs leading-6 text-[var(--text-secondary)]">Danh bạ nguồn tham khảo được tuyển chọn theo chủ đề. Đây là liên kết trực tiếp đến nhà xuất bản hoặc tổ chức nguồn, không phải nội dung được website tự xác minh theo thời gian thực.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-color)] px-3 py-1.5 text-[10px] text-[var(--text-muted)]"><ShieldCheck size={12} /> Ưu tiên nguồn gốc</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {informationCollections.map((collection) => (
            <article key={collection.category} className="min-w-0 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 sm:p-5">
              <h3 className="text-base font-serif font-bold text-[var(--text-primary)]">{collection.category}</h3>
              <p className="mt-2 text-xs leading-6 text-[var(--text-secondary)]">{collection.description}</p>
              <div className="mt-4 space-y-3">
                {collection.sources.map((source) => (
                  <a key={source.name} href={source.href} target="_blank" rel="noopener noreferrer" className="group flex items-start justify-between gap-3 rounded-lg px-2 py-2 -mx-2 transition hover:bg-[var(--bg-surface-subtle)]">
                    <span className="min-w-0">
                      <strong className="block text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)]">{source.name}</strong>
                      <span className="mt-0.5 block text-[10px] leading-5 text-[var(--text-muted)]">{source.description}</span>
                    </span>
                    <ExternalLink size={13} className="mt-0.5 shrink-0 text-[var(--text-muted)]" />
                  </a>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface-subtle)] p-4 sm:p-6">
        <div className="flex items-start gap-3"><Info size={18} className="mt-0.5 shrink-0 text-[var(--accent)]" /><div><h2 className="text-sm font-bold">Minh bạch dữ liệu và quyền riêng tư</h2><p className="mt-1 text-xs leading-6 text-[var(--text-secondary)]">Trang tự động tải sáu luồng dữ liệu công khai qua API trung gian của website; mỗi nguồn trả về tối đa 8 mục (HLE được lấy nhiều dòng hơn rồi rút gọn khi chuẩn hóa), có giới hạn kích thước phản hồi, timeout, bộ lọc dữ liệu và cache phía máy chủ khoảng 5 phút. Dữ liệu được hiển thị trực tiếp trong thẻ có thể mở rộng và tìm kiếm tại chỗ. Khi một nhà cung cấp lỗi hoặc giới hạn lượt gọi, giao diện báo trạng thái và vẫn giữ dữ liệu cục bộ gần nhất nếu có.</p><p className="mt-2 text-[10px] leading-5 text-[var(--text-muted)]">Dữ liệu hiển thị là metadata do nguồn bên ngoài cung cấp và có thể thay đổi hoặc có sai sót. Số sao, lượt tải, trích dẫn và mức độ nghiêm trọng không tự chứng minh chất lượng hay mức rủi ro toàn diện. Khi API lỗi, khách vẫn có thể mở trang nguồn chính thức. Danh bạ theo lĩnh vực là các liên kết tham khảo được tuyển chọn; hãy xem giấy phép, ngày cập nhật và phương pháp luận tại nguồn.</p></div></div>
      </section>
    </div>
  );
}
