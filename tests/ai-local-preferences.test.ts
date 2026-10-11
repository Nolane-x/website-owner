import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AIAppPreferences, PersistedChatMessage } from '@/lib/ai/local-preferences';
import {
  loadAIAppPreferences,
  loadAIChatHistory,
  saveAIAppPreferences,
  saveAIChatHistory,
} from '@/lib/ai/local-preferences';

function createStorage() {
  const records = new Map<string, string>();
  return {
    records,
    getItem(key: string) { return records.get(key) ?? null; },
    setItem(key: string, value: string) { records.set(key, String(value)); },
    removeItem(key: string) { records.delete(key); },
    clear() { records.clear(); },
    key(index: number) { return [...records.keys()][index] ?? null; },
    get length() { return records.size; },
  } as Storage;
}

const defaults: AIAppPreferences = {
  provider: 'search',
  model: 'openai/gpt-oss-20b',
  baseUrl: 'http://localhost:11434',
  includeContext: false,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('owner AI local preferences', () => {
  it('persists and restores provider/model/endpoint and optional context choice', () => {
    const storage = createStorage();
    vi.stubGlobal('window', { localStorage: storage });

    const selected: AIAppPreferences = {
      provider: 'openrouter',
      model: 'deepseek/deepseek-chat-v3.1',
      baseUrl: 'https://openrouter.ai/api/v1',
      includeContext: true,
    };

    expect(saveAIAppPreferences('ai-workbench', selected)).toBe(true);
    expect(loadAIAppPreferences('ai-workbench', defaults)).toEqual(selected);
  });

  it('does not persist an API key when saving ordinary preferences', () => {
    const storage = createStorage();
    vi.stubGlobal('window', { localStorage: storage });

    const selected = {
      provider: 'openrouter',
      model: 'deepseek/deepseek-chat-v3.1',
      baseUrl: 'https://openrouter.ai/api/v1',
      apiKey: 'THIS-MUST-NOT-BE-STORED',
    } as AIAppPreferences & { apiKey: string };

    expect(saveAIAppPreferences('ai-workbench', selected)).toBe(true);
    const raw = storage.getItem('webos:ai-preferences:v1:ai-workbench') || '';
    expect(raw).not.toContain('THIS-MUST-NOT-BE-STORED');
    expect(JSON.parse(raw)).not.toHaveProperty('apiKey');
  });

  it('falls back safely when stored provider values are malformed or unknown', () => {
    const storage = createStorage();
    vi.stubGlobal('window', { localStorage: storage });
    storage.setItem('webos:ai-preferences:v1:ai-workbench', JSON.stringify({
      provider: 'javascript:invalid',
      model: { injected: true },
      baseUrl: 'x'.repeat(3000),
      includeContext: 'yes',
    }));

    expect(loadAIAppPreferences('ai-workbench', defaults)).toEqual(defaults);
  });
});

describe('owner AI chat transcript persistence', () => {
  it('restores recent valid messages and bounds history size', () => {
    const storage = createStorage();
    vi.stubGlobal('window', { localStorage: storage });
    const messages: PersistedChatMessage[] = Array.from({ length: 80 }, (_, index) => ({
      id: `message-${index}`,
      sender: index % 2 === 0 ? 'user' : 'assistant',
      text: `Message ${index}`,
      timestamp: '10:00',
    }));
    expect(saveAIChatHistory('ai-workbench', messages)).toBe(true);
    const restored = loadAIChatHistory('ai-workbench');
    expect(restored).toHaveLength(60);
    expect(restored?.[0].id).toBe('message-20');
    expect(restored?.at(-1)?.id).toBe('message-79');
  });

  it('rejects malformed rows and handles corrupt JSON without throwing', () => {
    const storage = createStorage();
    vi.stubGlobal('window', { localStorage: storage });
    storage.setItem('webos:ai-chat:v1:ai-workbench', JSON.stringify([
      { id: 'valid', sender: 'user', text: 'hello', timestamp: '10:00' },
      { id: 42, sender: 'system', text: 'bad', timestamp: '10:01' },
    ]));
    expect(loadAIChatHistory('ai-workbench')).toEqual([
      { id: 'valid', sender: 'user', text: 'hello', timestamp: '10:00' },
    ]);
    storage.setItem('webos:ai-chat:v1:ai-workbench', '{bad-json');
    expect(loadAIChatHistory('ai-workbench')).toBeNull();
  });
});
