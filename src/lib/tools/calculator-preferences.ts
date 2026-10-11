export interface CalculatorHistoryPreference {
  expression: string;
  result: number;
  key: string;
}

export interface CalculatorPreferences {
  expression: string;
  result: number | null;
  angleMode: 'deg' | 'rad';
  history: CalculatorHistoryPreference[];
}

const STORAGE_KEY = 'webos:owner-calculator-preferences:v1';
const DEFAULT_EXPRESSION = 'sqrt(144) + 2^3';
const MAX_EXPRESSION_LENGTH = 300;
const MAX_HISTORY = 12;

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage; } catch { return null; }
}

export function defaultCalculatorPreferences(): CalculatorPreferences {
  return { expression: DEFAULT_EXPRESSION, result: null, angleMode: 'deg', history: [] };
}

export function normalizeCalculatorPreferences(value: unknown): CalculatorPreferences {
  const defaults = defaultCalculatorPreferences();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return defaults;
  const raw = value as Record<string, unknown>;
  const expression = typeof raw.expression === 'string'
    ? raw.expression.slice(0, MAX_EXPRESSION_LENGTH)
    : defaults.expression;
  const result = typeof raw.result === 'number' && Number.isFinite(raw.result)
    ? raw.result
    : null;
  const angleMode = raw.angleMode === 'rad' ? 'rad' : raw.angleMode === 'deg' ? 'deg' : defaults.angleMode;
  const history = Array.isArray(raw.history) ? raw.history.slice(0, MAX_HISTORY).flatMap((entry): CalculatorHistoryPreference[] => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
    const item = entry as Record<string, unknown>;
    if (typeof item.expression !== 'string' || item.expression.length > MAX_EXPRESSION_LENGTH) return [];
    if (typeof item.result !== 'number' || !Number.isFinite(item.result)) return [];
    if (typeof item.key !== 'string' || !item.key || item.key.length > 100) return [];
    return [{ expression: item.expression, result: item.result, key: item.key }];
  }) : [];
  return { expression, result, angleMode, history };
}

export function loadCalculatorPreferences(): CalculatorPreferences {
  const target = storage();
  if (!target) return defaultCalculatorPreferences();
  try {
    const raw = target.getItem(STORAGE_KEY);
    if (!raw || raw.length > 32_000) return defaultCalculatorPreferences();
    return normalizeCalculatorPreferences(JSON.parse(raw));
  } catch {
    return defaultCalculatorPreferences();
  }
}

export function saveCalculatorPreferences(value: CalculatorPreferences): boolean {
  const target = storage();
  if (!target) return false;
  const normalized = normalizeCalculatorPreferences(value);
  try {
    target.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return true;
  } catch {
    return false;
  }
}
