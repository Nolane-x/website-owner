import { describe, expect, it } from 'vitest';
import { normalizeEuropePmcPapers, normalizeSecurityAdvisories } from '@/lib/open-data/public-feeds';

describe('public Europe PMC feed normalization', () => {
  it('normalizes article metadata and constructs links on the trusted source host', () => {
    const papers = normalizeEuropePmcPapers({
      resultList: {
        result: [{
          source: 'MED',
          id: '12345',
          title: '  A study of machine learning  ',
          authorString: 'Doe J, Nguyen A',
          journalTitle: 'Open Science Journal',
          pubYear: '2026',
          doi: '10.1000/example.123',
          citedByCount: 12,
          abstractText: 'This paper studies reliable AI systems.',
          isOpenAccess: 'Y',
        }],
      },
    });

    expect(papers).toHaveLength(1);
    expect(papers[0]).toMatchObject({
      id: 'MED:12345',
      title: 'A study of machine learning',
      authors: 'Doe J, Nguyen A',
      journal: 'Open Science Journal',
      year: '2026',
      doi: '10.1000/example.123',
      citedByCount: 12,
      abstract: 'This paper studies reliable AI systems.',
      openAccess: true,
      url: 'https://europepmc.org/article/MED/12345',
    });
  });

  it('rejects malformed records, strips control characters, deduplicates, and limits output', () => {
    const result = normalizeEuropePmcPapers({
      resultList: {
        result: [
          { source: 'MED', id: '1', title: 'First\u0000 paper' },
          { source: 'MED', id: '1', title: 'Duplicate' },
          { source: '../evil', id: '2', title: 'Unsafe source' },
          { source: 'MED', id: '3', title: 'No year', pubYear: 'not-a-year', doi: 'javascript:alert(1)' },
          ...Array.from({ length: 10 }, (_, index) => ({ source: 'MED', id: String(index + 10), title: 'Paper ' + index })),
        ],
      },
    });

    expect(result.length).toBeLessThanOrEqual(8);
    expect(result.find((paper) => paper.id === 'MED:1')?.title).toBe('First paper');
    expect(result.some((paper) => paper.id === '../evil:2')).toBe(false);
    expect(result.find((paper) => paper.id === 'MED:3')?.year).toBeUndefined();
    expect(result.find((paper) => paper.id === 'MED:3')?.doi).toBeUndefined();
    expect(result.every((paper) => paper.url.startsWith('https://europepmc.org/'))).toBe(true);
  });

  it('fails clearly when the provider response shape is invalid', () => {
    expect(() => normalizeEuropePmcPapers(null)).toThrow('JSON hợp lệ');
    expect(() => normalizeEuropePmcPapers({ resultList: {} })).toThrow('không đúng định dạng');
  });
});

describe('public GitHub security advisory feed normalization', () => {
  it('normalizes reviewed advisories and builds a trusted advisory URL', () => {
    const advisories = normalizeSecurityAdvisories([{
      ghsa_id: 'GHSA-abcd-1234-efgh',
      cve_id: 'CVE-2026-12345',
      summary: '  Example dependency vulnerability ',
      description: 'A bounded detail.',
      severity: 'high',
      published_at: '2026-10-01T12:30:00Z',
      vulnerabilities: [{
        package: { ecosystem: 'npm', name: 'demo-package' },
        first_patched_version: '2.4.1',
      }],
      html_url: 'https://attacker.example/redirect',
    }]);

    expect(advisories).toEqual([{
      ghsaId: 'GHSA-ABCD-1234-EFGH',
      cveId: 'CVE-2026-12345',
      summary: 'Example dependency vulnerability',
      description: 'A bounded detail.',
      severity: 'high',
      publishedAt: '2026-10-01T12:30:00Z',
      packageName: 'demo-package',
      ecosystem: 'npm',
      patchedVersion: '2.4.1',
      url: 'https://github.com/advisories/GHSA-ABCD-1234-EFGH',
    }]);
  });

  it('drops malformed and duplicate advisory rows and bounds text', () => {
    const advisories = normalizeSecurityAdvisories([
      { ghsa_id: 'GHSA-abcd-1234-efgh', summary: 'First', severity: 'critical' },
      { ghsa_id: 'GHSA-abcd-1234-efgh', summary: 'Duplicate' },
      { ghsa_id: '../evil', summary: 'Unsafe identifier' },
      { ghsa_id: 'GHSA-1234-abcd-efgh', summary: 'x'.repeat(400), severity: 'not-a-severity' },
    ]);

    expect(advisories).toHaveLength(2);
    expect(advisories[0].url).toBe('https://github.com/advisories/GHSA-ABCD-1234-EFGH');
    expect(advisories[1].summary).toHaveLength(260);
    expect(advisories[1].severity).toBe('unknown');
  });

  it('rejects unexpected top-level payloads', () => {
    expect(() => normalizeSecurityAdvisories({ advisories: [] })).toThrow('danh sách cảnh báo');
    expect(() => normalizeSecurityAdvisories(null)).toThrow('danh sách cảnh báo');
  });
});
