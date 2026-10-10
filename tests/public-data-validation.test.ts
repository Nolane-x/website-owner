import { describe, expect, it } from 'vitest';
import {
  normalizeGitHubRepositories,
  normalizeHuggingFaceModels,
} from '@/lib/tools/public-data';

describe('public third-party data normalization', () => {
  it('normalizes Hugging Face models and caps the result at 12 items', () => {
    const models = normalizeHuggingFaceModels(Array.from({ length: 20 }, (_, index) => ({
      id: 'owner/model-' + index,
      downloads: index * 100,
      likes: index,
      pipeline_tag: 'text-generation',
      library_name: 'transformers',
    })));
    expect(models).toHaveLength(12);
    expect(models[0]).toMatchObject({
      id: 'owner/model-0',
      downloads: 0,
      likes: 0,
      pipeline_tag: 'text-generation',
      private: false,
    });
  });

  it('filters private, malformed, oversized and untrusted Hugging Face model fields', () => {
    const models = normalizeHuggingFaceModels([
      { id: 'owner/good', downloads: -1, likes: Number.POSITIVE_INFINITY, pipeline_tag: 'x'.repeat(200) },
      { id: 'owner/private', private: true },
      { id: '../escape' },
      { id: '/absolute' },
      { id: 'owner\\\\model' },
      { id: 'x'.repeat(201) },
      null,
      [],
    ]);
    expect(models).toHaveLength(1);
    expect(models[0]).toMatchObject({ id: 'owner/good', private: false });
    expect(models[0].downloads).toBeUndefined();
    expect(models[0].likes).toBeUndefined();
    expect(models[0].pipeline_tag).toHaveLength(80);
  });

  it.each([null, {}, 'not-an-array'])('rejects malformed Hugging Face payload %j', (payload) => {
    expect(() => normalizeHuggingFaceModels(payload)).toThrow();
  });

  it('normalizes public GitHub repositories and discards duplicate names case-insensitively', () => {
    const repositories = normalizeGitHubRepositories({
      items: [
        {
          full_name: 'OpenAI/Example',
          description: 'A useful open source project',
          stargazers_count: 12345,
          forks_count: 123,
          language: 'TypeScript',
          updated_at: '2026-10-01T00:00:00Z',
          html_url: 'javascript:alert(1)',
        },
        {
          full_name: 'openai/example',
          stargazers_count: 99,
          forks_count: 10,
        },
      ],
    });
    expect(repositories).toEqual([{
      fullName: 'OpenAI/Example',
      description: 'A useful open source project',
      stars: 12345,
      forks: 123,
      language: 'TypeScript',
      updatedAt: '2026-10-01T00:00:00Z',
    }]);
  });

  it('caps GitHub repositories at 10 and rejects malformed names/counters', () => {
    const repositories = normalizeGitHubRepositories({
      items: [
        { full_name: 'owner/valid', stargazers_count: 1, forks_count: 0 },
        { full_name: 'javascript:alert(1)', stargazers_count: 9, forks_count: 9 },
        { full_name: 'owner/../escape', stargazers_count: 9, forks_count: 9 },
        { full_name: 'owner/fraction', stargazers_count: 2.5, forks_count: 1 },
        { full_name: 'owner/no-forks', stargazers_count: 2 },
        ...Array.from({ length: 15 }, (_, index) => ({
          full_name: 'org/project-' + index,
          stargazers_count: index,
          forks_count: index,
        })),
      ],
    });
    expect(repositories.length).toBeLessThanOrEqual(10);
    expect(repositories.every((repo) => /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo.fullName))).toBe(true);
    expect(repositories.some((repo) => repo.fullName === 'owner/fraction')).toBe(false);
  });

  it.each([null, [], 'bad payload', { total_count: 2 }])('rejects malformed GitHub payload %j', (payload) => {
    expect(() => normalizeGitHubRepositories(payload)).toThrow();
  });
});
