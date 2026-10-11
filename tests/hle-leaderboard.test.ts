import { describe, expect, it } from 'vitest';
import { normalizeHleLeaderboard } from '@/lib/open-data/hle-leaderboard';

describe('Hugging Face HLE leaderboard normalization', () => {
  it('preserves score, rank, verification, notes and parameter count', () => {
    expect(normalizeHleLeaderboard([{
      rank: 1,
      modelId: 'demo-org/model-v1',
      value: 63.9,
      verified: true,
      notes: 'with tools',
      num_parameters: 70_000_000_000,
      source: { url: 'https://evil.example/redirect' },
    }])).toEqual([{
      rank: 1,
      modelId: 'demo-org/model-v1',
      value: 63.9,
      verified: true,
      notes: 'with tools',
      numParameters: 70_000_000_000,
    }]);
  });

  it.each([
    { rank: 0, modelId: 'org/model', value: 10 },
    { rank: 1.5, modelId: 'org/model', value: 10 },
    { rank: 1, modelId: 'org/model?redirect=evil', value: 10 },
    { rank: 1, modelId: 'org/model', value: Number.NaN },
    { rank: 1, modelId: 'org/model', value: Number.POSITIVE_INFINITY },
    { rank: 1, modelId: 'org/model', value: 1e20 },
    { rank: 1, modelId: 'bad model/model', value: 10 },
    { rank: 1, modelId: 'org/model/extra', value: 10 },
    { rank: 1, modelId: 'org/../evil', value: 10 },
    { rank: 1, modelId: 'x'.repeat(201), value: 10 },
  ])('drops malformed or hostile leaderboard rows', (row) => {
    expect(normalizeHleLeaderboard([row])).toEqual([]);
  });

  it('drops duplicate model entries and caps results at eight rows', () => {
    const rows = Array.from({ length: 20 }, (_, index) => ({
      rank: index + 1,
      modelId: 'organization/model-' + index,
      value: index + 0.25,
      verified: false,
    }));
    rows.splice(4, 0, { rank: 99, modelId: 'organization/model-0', value: 99, verified: true });
    const normalized = normalizeHleLeaderboard(rows);
    expect(normalized).toHaveLength(8);
    expect(normalized[0].modelId).toBe('organization/model-0');
    expect(normalized.filter((item) => item.modelId === 'organization/model-0')).toHaveLength(1);
  });

  it('treats only literal true as verified and bounds notes', () => {
    const [row] = normalizeHleLeaderboard([{
      rank: 1,
      modelId: 'org/model',
      value: 10,
      verified: 'true',
      notes: 'n'.repeat(300),
    }]);
    expect(row.verified).toBe(false);
    expect(row.notes).toHaveLength(180);
  });

  it('rejects a response that is not an array', () => {
    expect(() => normalizeHleLeaderboard({ results: [] })).toThrow(/bảng xếp hạng hợp lệ/);
  });
});
