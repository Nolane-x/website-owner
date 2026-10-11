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
import {
  normalizeEuropePmcPapers,
  normalizeSecurityAdvisories,
  type EuropePmcPaper,
  type PublicSecurityAdvisory,
} from '@/lib/open-data/public-feeds';

type Model = { id: string; downloads?: number; likes?: number; pipeline_tag?: string; lastModified?: string };
type Repository = { full_name: string; html_url: string; description?: string | null; stargazers_count?: number; language?: string | null; updated_at?: string };
type Story = { objectID: string; title?: string; story_title?: string; url?: string | null; story_url?: string | null; points?: number; num_comments?: number; created_at?: string };
type SourceId = 'models' | 'repos' | 'news' | 'hle' | 'papers' | 'security';
type FeedState<T> = { items: T[]; savedAt: number | null; status: string };
type CooldownState = Partial<Record<SourceId, number>>;

const CACHE_MS = 30 * 60 * 1000;
const COOLDOWN_MS = 45 * 1000;
const MAX_RESPONSE_BYTES = 180 * 1024;
const CACHE_KEYS: Record<SourceId, string> = {
  models: 'webos:public-feed:v2:models',
  repos: 'webos:public-feed:v2:repos',
  news: 'webos:public-feed:v2:news',
  hle: 'webos:public-feed:v2:hle',
  papers: 'webos:public-feed:v1:papers',
  security: 'webos:public-feed:v1:security-advisories',
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
  const [papers, setPapers] = useState<FeedState<EuropePmcPaper>>(defaultFeed);
  const [security, setSecurity] = useState<FeedState<PublicSecurityAdvisory>>(defaultFeed);
  const [loadingSource, setLoadingSource] = useState<SourceId | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<CooldownState>({});
  const [clockNow, setClockNow] = useState(0);
  const [storageReady, setStorageReady] = useState(false);
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
          const cacheStatus = 'Đang hiển thị dữ liệu đã lưu trong trình duyệt; chưa gọi API.';
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
              return [{ source: paper.id!.slice(0, separator), id: paper.id!.slice(separator + 1), title: paper.title, authorString: paper.authors, journalTitle: paper.journal, pubYear: paper.year, doi: paper.doi, citedByCount: paper.citedByCount, isOpenAccess: paper.openAccess ? 'Y' : 'N' }];
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
    }, 500);
    return () => window.clearInterval(timer);
  }, [cooldownUntilMax]);

  const getFeed = useCallback(async (source: SourceId) => {
    if (loadingSource) return;
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
      updateStatus('Đang dùng cache cục bộ 30 phút; chưa phát sinh yêu cầu API mới.');
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
    setLoadingSource(source);
    setClockNow(requestAt);
    setCooldownUntil((previous) => ({ ...previous, [source]: requestAt + COOLDOWN_MS }));
    updateStatus('Đang tải trực tiếp từ nguồn công khai…');
    try { window.localStorage.setItem(LAST_REQUEST_KEY + source, String(requestAt)); }
    catch { /* In-memory throttling remains active for this page session. */ }

    const endpoints: Record<SourceId, string> = {
      models: 'https://huggingface.co/api/models?pipeline_tag=text-generation&sort=downloads&direction=-1&limit=8',
      repos: 'https://api.github.com/search/repositories?q=topic%3Allm&sort=stars&order=desc&per_page=8',
      news: 'https://hn.algolia.com/api/v1/search_by_date?query=AI%20model&tags=story&hitsPerPage=8',
      hle: 'https://huggingface.co/api/datasets/cais/hle/leaderboard',
      papers: 'https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=TITLE_ABS%3A%22large%20language%20model%22%20OR%20TITLE_ABS%3A%22artificial%20intelligence%22&format=json&resultType=lite&pageSize=8&sort_date=y',
      security: 'https://api.github.com/advisories?per_page=8&sort=published&direction=desc',
    };

    try {
      const response = await fetch(endpoints[source], {
        method: 'GET', signal: controller.signal,
        headers: {
          Accept: source === 'security' ? 'application/vnd.github+json' : 'application/json',
          ...(source === 'repos' ? { 'X-GitHub-Api-Version': '2022-11-28' } : {}),
          ...(source === 'security' ? { 'X-GitHub-Api-Version': '2022-11-28' } : {}),
        },
        cache: 'no-store', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer',
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
      setLoadingSource(null);
    }
  }, [cooldownUntil, loadingSource, models, news, repos, hle, papers, security]);

  const disabled = (source: SourceId): boolean => {
    if (!storageReady || loadingSource !== null) return true;
    const current = source === 'models' ? models : source === 'repos' ? repos : source === 'news' ? news : source === 'hle' ? hle : source === 'papers' ? papers : security;
    const isFresh = typeof current.savedAt === 'number' && clockNow >= current.savedAt && clockNow - current.savedAt < CACHE_MS;
    return (cooldownUntil[source] ?? 0) > clockNow && !isFresh;
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
          Để tránh gọi lặp, mỗi nguồn dữ liệu có thời gian chờ riêng 45 giây và cache cục bộ 30 phút. Các nguồn khác vẫn có thể được mở trong lúc chờ.
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

        <article className="min-w-0 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 sm:p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div><div className="mb-1 flex items-center gap-2 text-xs font-mono uppercase tracking-wide text-[var(--accent)]"><BookOpen size={14} /> RESEARCH RADAR</div><h2 className="text-lg font-serif font-bold">Nghiên cứu khoa học mới</h2></div>
            <a href="https://europepmc.org/" target="_blank" rel="noopener noreferrer" aria-label="Mở Europe PMC" className="rounded-lg border border-[var(--border-color)] p-2 text-[var(--text-muted)] hover:text-[var(--accent)]"><ExternalLink size={14} /></a>
          </div>
          <p className="mb-4 text-xs leading-5 text-[var(--text-secondary)]">Bài báo liên quan đến trí tuệ nhân tạo và mô hình ngôn ngữ từ Europe PMC. Đây là metadata thư mục; quyền đọc toàn văn phụ thuộc từng bài và giấy phép.</p>
          <button type="button" onClick={() => getFeed('papers')} disabled={disabled('papers')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50">{loadingSource === 'papers' ? <LoaderCircle size={14} className="animate-spin" /> : <ArrowDownToLine size={14} />}{loadingSource === 'papers' ? 'Đang tải…' : papers.items.length ? 'Xem dữ liệu đã tải / kiểm tra cache' : 'Tải bài nghiên cứu'}</button>
          <p className="mt-3 min-h-10 text-[11px] leading-5 text-[var(--text-muted)]" aria-live="polite">{papers.status}</p>
          {papers.savedAt && <p className="mb-2 text-[10px] text-[var(--text-muted)]">Cập nhật {new Date(papers.savedAt).toLocaleString('vi-VN')} · cache 30 phút</p>}
          <div className="space-y-2">
            {papers.items.map((paper) => (
              <div key={paper.id} className="rounded-xl border border-[var(--border-color)] p-3">
                <a href={paper.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold leading-5 text-[var(--text-primary)] hover:text-[var(--accent)]">{paper.title}</a>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[var(--text-muted)]">
                  {paper.year && <span>{paper.year}</span>}{paper.journal && <span>{paper.journal}</span>}{paper.citedByCount !== undefined && <span>Trích dẫn: {formatNumber(paper.citedByCount)}</span>}
                  {paper.openAccess && <span className="rounded-md border border-emerald-500/30 px-1.5 py-0.5 text-emerald-700 dark:text-emerald-300">Open Access</span>}
                </div>
                {paper.authors && <p className="mt-2 text-[10px] leading-5 text-[var(--text-secondary)]">{paper.authors}</p>}
                {paper.doi && <p className="mt-1 text-[10px] text-[var(--text-muted)]">DOI: <a href={'https://doi.org/' + encodeURIComponent(paper.doi)} target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--accent)]">{paper.doi}</a></p>}
              </div>
            ))}
          </div>
          <p className="mt-4 text-[10px] leading-5 text-[var(--text-muted)]">Nguồn: <a className="underline" href="https://europepmc.org/RestfulWebService" target="_blank" rel="noopener noreferrer">Europe PMC REST API</a>. Truy vấn chỉ đọc, không cần API key và gửi trực tiếp từ trình duyệt.</p>
        </article>

        <article className="min-w-0 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 sm:p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div><div className="mb-1 flex items-center gap-2 text-xs font-mono uppercase tracking-wide text-[var(--accent)]"><ShieldCheck size={14} /> SECURITY RADAR</div><h2 className="text-lg font-serif font-bold">Cảnh báo bảo mật phần mềm</h2></div>
            <a href="https://github.com/advisories" target="_blank" rel="noopener noreferrer" aria-label="Mở GitHub Security Advisories" className="rounded-lg border border-[var(--border-color)] p-2 text-[var(--text-muted)] hover:text-[var(--accent)]"><ExternalLink size={14} /></a>
          </div>
          <p className="mb-4 text-xs leading-5 text-[var(--text-secondary)]">Cảnh báo lỗ hổng công khai đã được GitHub xem xét, hữu ích khi theo dõi thư viện và chuỗi cung ứng phần mềm. Không thay thế quy trình đánh giá rủi ro của dự án.</p>
          <button type="button" onClick={() => getFeed('security')} disabled={disabled('security')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50">{loadingSource === 'security' ? <LoaderCircle size={14} className="animate-spin" /> : <ArrowDownToLine size={14} />}{loadingSource === 'security' ? 'Đang tải…' : security.items.length ? 'Xem dữ liệu đã tải / kiểm tra cache' : 'Tải cảnh báo bảo mật'}</button>
          <p className="mt-3 min-h-10 text-[11px] leading-5 text-[var(--text-muted)]" aria-live="polite">{security.status}</p>
          {security.savedAt && <p className="mb-2 text-[10px] text-[var(--text-muted)]">Cập nhật {new Date(security.savedAt).toLocaleString('vi-VN')} · cache 30 phút</p>}
          <div className="space-y-2">
            {security.items.map((advisory) => (
              <div key={advisory.ghsaId} className="rounded-xl border border-[var(--border-color)] p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <a href={advisory.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 text-xs font-semibold leading-5 text-[var(--text-primary)] hover:text-[var(--accent)]">{advisory.summary}</a>
                  <span className={advisory.severity === 'critical' || advisory.severity === 'high' ? 'rounded-md border border-red-500/30 px-2 py-1 text-[9px] font-semibold uppercase text-red-700 dark:text-red-300' : 'rounded-md border border-[var(--border-color)] px-2 py-1 text-[9px] font-semibold uppercase text-[var(--text-muted)]'}>{advisory.severity || 'unknown'}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[var(--text-muted)]"><span>{advisory.ghsaId}</span>{advisory.cveId && <span>{advisory.cveId}</span>}{advisory.publishedAt && <span>{new Date(advisory.publishedAt).toLocaleDateString('vi-VN')}</span>}</div>
                {advisory.description && <p className="mt-2 line-clamp-3 text-[10px] leading-5 text-[var(--text-secondary)]">{advisory.description}</p>}
                {advisory.packageName && <p className="mt-2 text-[10px] text-[var(--text-muted)]">Gói: {advisory.packageName}{advisory.ecosystem ? ' · ' + advisory.ecosystem : ''}{advisory.patchedVersion ? ' · Bản sửa: ' + advisory.patchedVersion : ''}</p>}
              </div>
            ))}
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
        <div className="flex items-start gap-3"><Info size={18} className="mt-0.5 shrink-0 text-[var(--accent)]" /><div><h2 className="text-sm font-bold">Minh bạch dữ liệu và quyền riêng tư</h2><p className="mt-1 text-xs leading-6 text-[var(--text-secondary)]">Trang không gọi feed API khi vừa mở. Sáu nguồn dữ liệu động chỉ chạy khi khách bấm yêu cầu, tối đa 8 mục mỗi nguồn, timeout 10 giây, hủy phản hồi trên 180 KiB và cache cục bộ 30 phút. Cooldown 45 giây áp dụng riêng cho từng nguồn để có thể khám phá nhiều lĩnh vực mà không gọi lặp liên tục. Lời gọi diễn ra trực tiếp từ trình duyệt, không dùng API key, không qua proxy của website và không tiêu tốn lượt gọi backend của website; nhà cung cấp vẫn áp dụng giới hạn riêng.</p><p className="mt-2 text-[10px] leading-5 text-[var(--text-muted)]">Dữ liệu hiển thị là metadata do nguồn bên ngoài cung cấp và có thể thay đổi hoặc có sai sót. Số sao, lượt tải, trích dẫn và mức độ nghiêm trọng không tự chứng minh chất lượng hay mức rủi ro toàn diện. Khi API lỗi, khách vẫn có thể mở trang nguồn chính thức. Danh bạ theo lĩnh vực là các liên kết tham khảo được tuyển chọn; hãy xem giấy phép, ngày cập nhật và phương pháp luận tại nguồn.</p></div></div>
      </section>
    </div>
  );
}
