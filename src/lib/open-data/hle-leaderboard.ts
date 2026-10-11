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

/**
 * Normalize untrusted results from Hugging Face's public HLE leaderboard API.
 * Keep the feed intentionally small and construct outbound model URLs from the
 * validated identifier rather than accepting arbitrary URLs from the response.
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
    const modelId = item.modelId;
    const score = item.value;
    if (
      typeof rank !== 'number' || !Number.isSafeInteger(rank) || rank < 1 || rank > 100_000 ||
      typeof modelId !== 'string' || modelId.length < 3 || modelId.length > MAX_MODEL_ID_LENGTH ||
      !/^[^/\s?#]+\/[^/\s?#]+$/.test(modelId) ||
      /[\u0000-\u001f\u007f]/.test(modelId) ||
      typeof score !== 'number' || !Number.isFinite(score) || Math.abs(score) > 1_000_000_000 ||
      seenModels.has(modelId)
    ) {
      continue;
    }

    const row: HleLeaderboardEntry = {
      rank,
      modelId,
      value: score,
      verified: item.verified === true,
    };
    if (typeof item.notes === 'string') row.notes = item.notes.slice(0, MAX_NOTES_LENGTH);
    if (
      typeof item.num_parameters === 'number' &&
      Number.isFinite(item.num_parameters) &&
      item.num_parameters > 0 &&
      item.num_parameters <= Number.MAX_SAFE_INTEGER
    ) {
      row.numParameters = item.num_parameters;
    }

    output.push(row);
    seenModels.add(modelId);
    if (output.length >= MAX_ROWS) break;
  }

  return output;
}
