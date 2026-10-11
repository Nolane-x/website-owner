export type EuropePmcPaper = {
  id: string;
  title: string;
  authors?: string;
  journal?: string;
  year?: string;
  doi?: string;
  citedByCount?: number;
  abstract?: string;
  openAccess: boolean;
  url: string;
};

export type PublicSecurityAdvisory = {
  ghsaId: string;
  cveId?: string;
  summary: string;
  description?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'unknown';
  publishedAt?: string;
  packageName?: string;
  ecosystem?: string;
  patchedVersion?: string;
  url: string;
};

function boundedText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned ? cleaned.slice(0, maxLength) : undefined;
}

function finiteNonNegative(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
}

export function normalizeEuropePmcPapers(input: unknown): EuropePmcPaper[] {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Europe PMC không trả về dữ liệu JSON hợp lệ.');
  }
  const resultList = (input as { resultList?: unknown }).resultList;
  if (!resultList || typeof resultList !== 'object' || Array.isArray(resultList)) {
    throw new Error('Europe PMC không trả về danh sách nghiên cứu.');
  }
  const results = (resultList as { result?: unknown }).result;
  if (!Array.isArray(results)) throw new Error('Danh sách nghiên cứu không đúng định dạng.');

  const seen = new Set<string>();
  return results.slice(0, 8).flatMap((value): EuropePmcPaper[] => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
    const item = value as Record<string, unknown>;
    const id = boundedText(item.id, 80);
    const source = boundedText(item.source, 20);
    const title = boundedText(item.title, 320);
    if (!id || !source || !title || !/^[a-zA-Z0-9_-]+$/.test(source) || !/^[a-zA-Z0-9._:-]+$/.test(id)) return [];

    const key = source + ':' + id;
    if (seen.has(key)) return [];
    seen.add(key);

    const doi = boundedText(item.doi, 180);
    const safeDoi = doi && /^10\.\d{4,9}\/[\-._;()/:A-Z0-9]+$/i.test(doi) ? doi : undefined;
    const year = boundedText(item.pubYear, 4);
    const authors = boundedText(item.authorString, 180);
    const journal = boundedText(item.journalTitle, 140);
    const citedByCount = finiteNonNegative(item.citedByCount);
    const abstract = boundedText(item.abstractText, 1_800);
    const openAccess = item.isOpenAccess === 'Y' || item.isOpenAccess === 'y' || item.isOpenAccess === true;

    return [{
      id: key,
      title,
      ...(authors ? { authors } : {}),
      ...(journal ? { journal } : {}),
      ...(year && /^\d{4}$/.test(year) ? { year } : {}),
      ...(safeDoi ? { doi: safeDoi } : {}),
      ...(citedByCount !== undefined ? { citedByCount } : {}),
      ...(abstract ? { abstract } : {}),
      openAccess,
      url: 'https://europepmc.org/article/' + encodeURIComponent(source) + '/' + encodeURIComponent(id),
    }];
  });
}

const severityValues = new Set(['critical', 'high', 'medium', 'low']);

export function normalizeSecurityAdvisories(input: unknown): PublicSecurityAdvisory[] {
  if (!Array.isArray(input)) throw new Error('GitHub không trả về danh sách cảnh báo bảo mật.');

  const seen = new Set<string>();
  return input.slice(0, 8).flatMap((value): PublicSecurityAdvisory[] => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
    const item = value as Record<string, unknown>;
    const ghsaId = boundedText(item.ghsa_id, 40)?.toUpperCase();
    const summary = boundedText(item.summary, 260);
    if (!ghsaId || !/^GHSA-[A-Z0-9-]{8,24}$/.test(ghsaId) || !summary || seen.has(ghsaId)) return [];
    seen.add(ghsaId);

    const cveCandidate = boundedText(item.cve_id, 32)?.toUpperCase();
    const cveId = cveCandidate && /^CVE-\d{4}-\d{4,}$/.test(cveCandidate) ? cveCandidate : undefined;
    const severityCandidate = boundedText(item.severity, 20)?.toLowerCase();
    const severity = severityCandidate && severityValues.has(severityCandidate)
      ? severityCandidate as PublicSecurityAdvisory['severity']
      : 'unknown';
    const publishedAt = boundedText(item.published_at, 40);
    const safePublishedAt = publishedAt && Number.isFinite(Date.parse(publishedAt)) ? publishedAt : undefined;
    const description = boundedText(item.description, 560);

    const vulnerabilities = Array.isArray(item.vulnerabilities) ? item.vulnerabilities : [];
    const firstVulnerability = vulnerabilities[0] && typeof vulnerabilities[0] === 'object'
      ? vulnerabilities[0] as Record<string, unknown>
      : undefined;
    const packageRecord = firstVulnerability?.package && typeof firstVulnerability.package === 'object'
      ? firstVulnerability.package as Record<string, unknown>
      : undefined;

    const packageName = boundedText(packageRecord?.name, 120);
    const ecosystem = boundedText(packageRecord?.ecosystem, 40);
    const patchedVersion = boundedText(firstVulnerability?.first_patched_version, 80);

    return [{
      ghsaId,
      ...(cveId ? { cveId } : {}),
      summary,
      ...(description ? { description } : {}),
      ...(severity ? { severity } : {}),
      ...(safePublishedAt ? { publishedAt: safePublishedAt } : {}),
      ...(packageName ? { packageName } : {}),
      ...(ecosystem ? { ecosystem } : {}),
      ...(patchedVersion ? { patchedVersion } : {}),
      url: 'https://github.com/advisories/' + encodeURIComponent(ghsaId),
    }];
  });
}
