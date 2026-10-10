function normalizeJson(value: unknown): unknown {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new TypeError('Backup payload is not JSON serializable.');
  return JSON.parse(serialized) as unknown;
}

/** Stable serialization for JSON backups, including Date-to-ISO normalization. */
export function canonicalJson(value: unknown): string {
  const normalized = normalizeJson(value);
  const encode = (input: unknown): string => {
    if (input === null) return 'null';
    if (typeof input === 'string' || typeof input === 'boolean') return JSON.stringify(input);
    if (typeof input === 'number') return Number.isFinite(input) ? JSON.stringify(input) : 'null';
    if (Array.isArray(input)) return `[${input.map(encode).join(',')}]`;
    if (typeof input === 'object') {
      const object = input as Record<string, unknown>;
      const keys = Object.keys(object).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
      return `{${keys.map((key) => `${JSON.stringify(key)}:${encode(object[key])}`).join(',')}}`;
    }
    return 'null';
  };
  return encode(normalized);
}
