export type HleLeaderboardEntry = {
  rank: number;
  modelId: string;
  value: number;
  verified: boolean;
  notes?: string;
  numParameters?: number;
};

const MAX_ROWS = 8;
const MAX_MODEL_ID_LENGTH = 200;
const MAX_NOTES_LENGTH = 180;

function safeModelId(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length < 3 || value.length > MAX_MODEL_ID_LENGTH) return undefined;
  const parts = value.split('/');
  if (parts.length !== 2 || parts.some((part) =>
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(part) || part === '.' || part === '..'
  )) return undefined;
  if (/[\u0000-\u001f\u007f?#%]/.test(value)) return undefined;
  return value;
}

function modelIdFromSourceUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 1024) return undefined;
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' || url.hostname !== 'huggingface.co' ||
      url.username || url.password || url.search || url.hash
    ) return undefined;
    const path = url.pathname.split('/').filter(Boolean);
    if (path.length !== 2) return undefined;
    const decoded = path.map((part) => {
      try { return decodeURIComponent(part); } catch { return ''; }
    });
    return safeModelId(decoded.join('/'));
  } catch {
    return undefined;
  }
}

/**
 * Normalize untrusted results from Hugging Face's public HLE leaderboard API.
 * The live endpoint supplies model identity under source.url, not modelId.
 * A fallback modelId remains supported for cached payloads and future API shapes.
 */
export function normalizeHleLeaderboard(input: unknown): HleLeaderboardEntry[] {
  if (!Array.isArray(input)) {
    throw new Error('Hugging Face HLE API không trả về một bảng xếp hạng hợp lệ.');
  }

  const output: HleLeaderboardEntry[] = [];
  const seenModels = new Set<string>();

  for (const value of input) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const item = value as Record<string, unknown>;
    const rank = item.rank;
    const source = item.source && typeof item.source === 'object' && !Array.isArray(item.source)
      ? item.source as Record<string, unknown>
      : undefined;
    const modelId = safeModelId(item.modelId)
      ?? safeModelId(item.model_id)
      ?? safeModelId(item.repo_id)
      ?? modelIdFromSourceUrl(source?.url);
    const score = item.value;

    if (
      typeof rank !== 'number' || !Number.isSafeInteger(rank) || rank < 1 || rank > 100_000 ||
      !modelId ||
      typeof score !== 'number' || !Number.isFinite(score) || Math.abs(score) > 1_000_000_000 ||
      seenModels.has(modelId)
    ) continue;

    const row: HleLeaderboardEntry = { rank, modelId, value: score, verified: item.verified === true };
    if (typeof item.notes === 'string') row.notes = item.notes.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, MAX_NOTES_LENGTH);
    if (
      typeof item.num_parameters === 'number' && Number.isFinite(item.num_parameters) &&
      item.num_parameters > 0 && item.num_parameters <= Number.MAX_SAFE_INTEGER
    ) row.numParameters = item.num_parameters;

    output.push(row);
    seenModels.add(modelId);
    if (output.length >= MAX_ROWS) break;
  }

  return output;
}
