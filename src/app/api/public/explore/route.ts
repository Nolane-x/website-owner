import { checkPublicAccessProtection } from '@/lib/auth/guard';
import { checkPublicApiRateLimit } from '@/lib/security/public-api-guard';

const SOURCE_ENDPOINTS = {
  models: {
    url: 'https://huggingface.co/api/models?pipeline_tag=text-generation&sort=downloads&direction=-1&limit=8',
    accept: 'application/json',
  },
  repos: {
    url: 'https://api.github.com/search/repositories?q=topic%3Allm&sort=stars&order=desc&per_page=8',
    accept: 'application/vnd.github+json',
  },
  news: {
    url: 'https://hn.algolia.com/api/v1/search_by_date?query=AI%20model&tags=story&hitsPerPage=8',
    accept: 'application/json',
  },
  hle: {
    url: 'https://huggingface.co/api/datasets/cais/hle/leaderboard',
    accept: 'application/json',
  },
  papers: {
    url: 'https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=TITLE_ABS%3A%22large%20language%20model%22%20OR%20TITLE_ABS%3A%22artificial%20intelligence%22&format=json&resultType=core&pageSize=8&sort_date=y',
    accept: 'application/json',
  },
  security: {
    url: 'https://api.github.com/advisories?per_page=8&sort=published&direction=desc',
    accept: 'application/vnd.github+json',
  },
} as const;

type ExploreSource = keyof typeof SOURCE_ENDPOINTS;
const MAX_UPSTREAM_BYTES = 768 * 1024;
const CACHE_SECONDS = 300;

function isExploreSource(value: string | null): value is ExploreSource {
  return value !== null && Object.prototype.hasOwnProperty.call(SOURCE_ENDPOINTS, value);
}

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}

async function readJsonBounded(response: Response): Promise<unknown> {
  if (!(response.headers.get('content-type') ?? '').toLowerCase().includes('json')) {
    throw new Error('Nguồn dữ liệu không trả về JSON.');
  }
  const declaredLength = Number(response.headers.get('content-length') ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_UPSTREAM_BYTES) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error('Phản hồi nguồn dữ liệu vượt giới hạn.');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Không đọc được nội dung nguồn dữ liệu.');
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_UPSTREAM_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new Error('Phản hồi nguồn dữ liệu vượt giới hạn.');
      }
      chunks.push(value);
    }
  } finally {
    try { reader.releaseLock(); } catch { /* Stream may already be released. */ }
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown;
  } catch {
    throw new Error('Nguồn dữ liệu trả về JSON không hợp lệ.');
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

/** Keep only fields rendered by the portal; never relay entire provider payloads to visitors. */
function compactPayload(source: ExploreSource, payload: unknown): unknown {
  if (source === 'models') {
    if (!Array.isArray(payload)) throw new Error('Danh sách mô hình không đúng định dạng.');
    return payload.slice(0, 8).flatMap((value) => {
      const item = record(value);
      if (!item) return [];
      return [{
        id: item.id, private: item.private, downloads: item.downloads, likes: item.likes,
        pipeline_tag: item.pipeline_tag, tags: Array.isArray(item.tags) ? item.tags.slice(0, 12) : [],
        lastModified: item.lastModified, library_name: item.library_name, gated: item.gated,
      }];
    });
  }

  if (source === 'repos') {
    const root = record(payload);
    if (!root || !Array.isArray(root.items)) throw new Error('GitHub không trả về danh sách dự án.');
    return {
      total_count: typeof root.total_count === 'number' ? root.total_count : undefined,
      items: root.items.slice(0, 8).flatMap((value: unknown) => {
        const item = record(value);
        if (!item) return [];
        const license = record(item.license);
        return [{
          full_name: item.full_name, html_url: item.html_url, description: item.description,
          stargazers_count: item.stargazers_count, forks_count: item.forks_count,
          open_issues_count: item.open_issues_count, language: item.language,
          updated_at: item.updated_at, created_at: item.created_at, default_branch: item.default_branch,
          topics: Array.isArray(item.topics) ? item.topics.slice(0, 8) : [],
          license: license ? { name: license.name, spdx_id: license.spdx_id } : null,
          archived: item.archived,
        }];
      }),
    };
  }

  if (source === 'news') {
    const root = record(payload);
    if (!root || !Array.isArray(root.hits)) throw new Error('Hacker News không trả về danh sách thảo luận.');
    return {
      hits: root.hits.slice(0, 8).flatMap((value: unknown) => {
        const item = record(value);
        if (!item) return [];
        return [{
          objectID: item.objectID, title: item.title, story_title: item.story_title,
          url: item.url, story_url: item.story_url,
          story_text: typeof item.story_text === 'string' ? item.story_text.slice(0, 2400) : undefined,
          points: item.points, num_comments: item.num_comments, created_at: item.created_at,
          author: typeof item.author === 'string' ? item.author.slice(0, 80) : undefined,
        }];
      }),
    };
  }

  if (source === 'hle') {
    if (!Array.isArray(payload)) throw new Error('HLE không trả về bảng xếp hạng.');
    return payload.slice(0, 24).flatMap((value: unknown) => {
      const item = record(value);
      if (!item) return [];
      const origin = record(item.source);
      return [{
        rank: item.rank, modelId: item.modelId, filename: item.filename, value: item.value,
        verified: item.verified, notes: typeof item.notes === 'string' ? item.notes.slice(0, 240) : undefined,
        num_parameters: item.num_parameters,
        source: origin ? { url: origin.url, name: origin.name } : undefined,
      }];
    });
  }

  if (source === 'papers') {
    const root = record(payload);
    const list = record(root?.resultList);
    if (!list || !Array.isArray(list.result)) throw new Error('Europe PMC không trả về danh sách nghiên cứu.');
    return {
      resultList: {
        result: list.result.slice(0, 8).flatMap((value: unknown) => {
          const item = record(value);
          if (!item) return [];
          return [{
            source: item.source, id: item.id, title: item.title, authorString: item.authorString,
            journalTitle: item.journalTitle, pubYear: item.pubYear, doi: item.doi,
            citedByCount: item.citedByCount, isOpenAccess: item.isOpenAccess,
            abstractText: typeof item.abstractText === 'string' ? item.abstractText.slice(0, 4200) : undefined,
          }];
        }),
      },
    };
  }

  if (!Array.isArray(payload)) throw new Error('GitHub không trả về danh sách cảnh báo bảo mật.');
  return payload.slice(0, 8).flatMap((value: unknown) => {
    const item = record(value);
    if (!item) return [];
    const vulnerabilities = Array.isArray(item.vulnerabilities)
      ? item.vulnerabilities.slice(0, 2).flatMap((value: unknown) => {
        const vulnerability = record(value);
        const packageInfo = record(vulnerability?.package);
        if (!vulnerability) return [];
        return [{
          package: packageInfo ? { name: packageInfo.name, ecosystem: packageInfo.ecosystem } : undefined,
          first_patched_version: vulnerability.first_patched_version,
        }];
      })
      : [];
    return [{
      ghsa_id: item.ghsa_id, cve_id: item.cve_id, summary: item.summary,
      description: typeof item.description === 'string' ? item.description.slice(0, 2600) : undefined,
      severity: item.severity, published_at: item.published_at, vulnerabilities,
    }];
  });
}

export async function GET(request: Request): Promise<Response> {
  const limited = checkPublicApiRateLimit(request, 'explore', 30);
  if (limited) return limited;

  const source = new URL(request.url).searchParams.get('source');
  if (!isExploreSource(source)) {
    return jsonError('Nguồn dữ liệu không hợp lệ. Hãy chọn một nguồn khám phá được hỗ trợ.', 400);
  }

  let access: Awaited<ReturnType<typeof checkPublicAccessProtection>>;
  try {
    access = await checkPublicAccessProtection();
  } catch {
    return jsonError('Không thể xác minh cấu hình truy cập trang lúc này.', 503);
  }
  if (access.requirePassword && !access.hasValidGuestSession) {
    return jsonError('Yêu cầu mật mã truy cập.', 403);
  }

  const provider = SOURCE_ENDPOINTS[source];
  try {
    const upstream = await fetch(provider.url, {
      method: 'GET',
      headers: {
        Accept: provider.accept,
        'User-Agent': 'Nolane-Explore-Portal',
        ...(source === 'repos' || source === 'security' ? { 'X-GitHub-Api-Version': '2022-11-28' } : {}),
      },
      cache: 'force-cache',
      next: { revalidate: CACHE_SECONDS, tags: ['public-explore', 'public-explore-' + source] },
      redirect: 'error',
      signal: AbortSignal.timeout(8_000),
    });
    if (!upstream.ok) {
      return jsonError(
        upstream.status === 429
          ? 'Nhà cung cấp đang giới hạn yêu cầu. Dữ liệu đã lưu vẫn có thể được xem.'
          : 'Nhà cung cấp dữ liệu tạm thời không trả về kết quả.',
        upstream.status === 429 ? 429 : 502,
      );
    }
    const compact = compactPayload(source, await readJsonBounded(upstream));
    return Response.json(compact, {
      headers: {
        // Access protection can change at any time; never cache these public routes at the edge.
        // Only the allow-listed upstream fetch itself is cached for five minutes.
        'Cache-Control': 'private, no-store, max-age=0',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'X-Explore-Source': source,
      },
    });
  } catch (error) {
    const timeout = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    return jsonError(
      timeout ? 'Nguồn phản hồi quá chậm; có thể thử lại sau.' : 'Không thể lấy dữ liệu từ nguồn này lúc này.',
      502,
    );
  }
}
