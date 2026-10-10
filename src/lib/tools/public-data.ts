export type HuggingFaceModel = {
  id: string;
  downloads?: number;
  likes?: number;
  lastModified?: string;
  pipeline_tag?: string;
  library_name?: string;
  private?: boolean;
};

export type GitHubRepository = {
  fullName: string;
  description?: string;
  stars: number;
  forks: number;
  language?: string;
  updatedAt?: string;
};

function safeNonNegativeCount(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : undefined;
}

function safeText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  return text ? text.slice(0, maxLength) : undefined;
}

/** Identifiers are rejected when malformed; never truncate an identifier into another resource. */
function isValidHuggingFaceId(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const id = value.trim();
  if (!id || id.length > 200 || id !== value || id.includes('\\')) return false;
  return /^[A-Za-z0-9][A-Za-z0-9._-]*(?:\/[A-Za-z0-9][A-Za-z0-9._-]*)?$/.test(id);
}

/** Normalize third-party API data before it enters React state or localStorage. */
export function normalizeHuggingFaceModels(payload: unknown): HuggingFaceModel[] {
  if (!Array.isArray(payload)) throw new Error('Hugging Face response format is invalid.');

  return payload.slice(0, 12).flatMap((row): HuggingFaceModel[] => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return [];
    const item = row as Record<string, unknown>;
    if (!isValidHuggingFaceId(item.id) || item.private === true) return [];

    return [{
      id: item.id,
      downloads: safeNonNegativeCount(item.downloads),
      likes: safeNonNegativeCount(item.likes),
      lastModified: safeText(item.lastModified, 40),
      pipeline_tag: safeText(item.pipeline_tag, 80),
      library_name: safeText(item.library_name, 80),
      private: false,
    }];
  });
}

/**
 * Accept only public repository names; construct canonical links from a validated
 * owner/name instead of trusting an upstream html_url value.
 */
export function normalizeGitHubRepositories(payload: unknown): GitHubRepository[] {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('GitHub response format is invalid.');
  }
  const items = (payload as Record<string, unknown>).items;
  if (!Array.isArray(items)) throw new Error('GitHub response has no repository list.');

  const seen = new Set<string>();
  return items.slice(0, 10).flatMap((row): GitHubRepository[] => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return [];
    const item = row as Record<string, unknown>;
    if (typeof item.full_name !== 'string' || item.full_name.length > 201) return [];
    const fullName = item.full_name.trim();
    if (fullName !== item.full_name ||
        !/^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/.test(fullName) ||
        fullName.split('/').some((part) => part === '.' || part === '..')) return [];

    const canonicalName = fullName.toLowerCase();
    if (seen.has(canonicalName)) return [];

    const stars = safeNonNegativeCount(item.stargazers_count);
    const forks = safeNonNegativeCount(item.forks_count);
    if (stars === undefined || forks === undefined) return [];
    seen.add(canonicalName);

    return [{
      fullName,
      description: safeText(item.description, 400),
      stars,
      forks,
      language: safeText(item.language, 80),
      updatedAt: safeText(item.updated_at, 40),
    }];
  });
}
