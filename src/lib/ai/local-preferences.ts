import { AI_PROVIDER_PRESETS, type RemoteAIProvider } from '@/lib/ai/client';

export type AIAppId = 'ai-workbench' | 'creator-studio';
export type AISelection = RemoteAIProvider | 'search';

export interface AIAppPreferences {
  provider: AISelection;
  model: string;
  baseUrl: string;
  includeContext?: boolean;
}

export interface PersistedChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  sources?: string[];
}

const SETTINGS_PREFIX = 'webos:ai-preferences:v1:';
const CHAT_PREFIX = 'webos:ai-chat:v1:';
const SECRETS_DATABASE = 'webos-local-secrets-v1';
const SECRETS_STORE = 'records';
const ENCRYPTION_KEY_ID = 'ai-api-key-aes-gcm-v1';
const MAX_CHAT_MESSAGES = 60;
const MAX_MESSAGE_CHARS = 8_000;
const MAX_CHAT_STORAGE_CHARS = 360_000;

let databasePromise: Promise<IDBDatabase> | null = null;
let encryptionKeyPromise: Promise<CryptoKey> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function validProvider(value: unknown): value is RemoteAIProvider {
  return typeof value === 'string' && AI_PROVIDER_PRESETS.some((preset) => preset.id === value);
}

function browserStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadAIAppPreferences(
  app: AIAppId,
  defaults: AIAppPreferences,
): AIAppPreferences {
  const storage = browserStorage();
  if (!storage) return { ...defaults };
  try {
    const raw = storage.getItem(SETTINGS_PREFIX + app);
    if (!raw) return { ...defaults };
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value)) return { ...defaults };

    const provider: AISelection = value.provider === 'search'
      ? 'search'
      : validProvider(value.provider) ? value.provider : defaults.provider;
    const model = typeof value.model === 'string' && value.model.trim() && value.model.length <= 240
      ? value.model.trim()
      : defaults.model;
    const baseUrl = typeof value.baseUrl === 'string' && value.baseUrl.trim() && value.baseUrl.length <= 2048
      ? value.baseUrl.trim()
      : defaults.baseUrl;
    const includeContext = typeof value.includeContext === 'boolean'
      ? value.includeContext
      : defaults.includeContext;

    return {
      provider,
      model,
      baseUrl,
      ...(includeContext !== undefined ? { includeContext } : {}),
    };
  } catch {
    return { ...defaults };
  }
}

/** Only non-secret preferences are stored in localStorage. API keys never enter this record. */
export function saveAIAppPreferences(app: AIAppId, preferences: AIAppPreferences): boolean {
  const storage = browserStorage();
  if (!storage) return false;
  const record = {
    provider: preferences.provider,
    model: preferences.model.slice(0, 240),
    baseUrl: preferences.baseUrl.slice(0, 2048),
    ...(preferences.includeContext !== undefined ? { includeContext: preferences.includeContext } : {}),
  };
  try {
    storage.setItem(SETTINGS_PREFIX + app, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

function normalizeChatMessages(value: unknown): PersistedChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value.slice(-MAX_CHAT_MESSAGES).flatMap((item): PersistedChatMessage[] => {
    if (!isRecord(item) || (item.sender !== 'user' && item.sender !== 'assistant')) return [];
    if (typeof item.id !== 'string' || !item.id || item.id.length > 160) return [];
    if (typeof item.text !== 'string' || typeof item.timestamp !== 'string') return [];
    const sources = Array.isArray(item.sources)
      ? item.sources.filter((source): source is string => typeof source === 'string').slice(0, 8).map((source) => source.slice(0, 240))
      : undefined;
    return [{
      id: item.id,
      sender: item.sender,
      text: item.text.slice(-MAX_MESSAGE_CHARS),
      timestamp: item.timestamp.slice(0, 40),
      ...(sources?.length ? { sources } : {}),
    }];
  });
}

export function loadAIChatHistory(app: AIAppId): PersistedChatMessage[] | null {
  const storage = browserStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(CHAT_PREFIX + app);
    if (!raw || raw.length > MAX_CHAT_STORAGE_CHARS * 2) return null;
    const normalized = normalizeChatMessages(JSON.parse(raw));
    return normalized.length ? normalized : null;
  } catch {
    return null;
  }
}

/** Store only a bounded recent transcript, locally on this browser. Never sends it to the site backend. */
export function saveAIChatHistory(app: AIAppId, messages: PersistedChatMessage[]): boolean {
  const storage = browserStorage();
  if (!storage) return false;
  const bounded = normalizeChatMessages(messages);
  let serialized = JSON.stringify(bounded);
  while (serialized.length > MAX_CHAT_STORAGE_CHARS && bounded.length > 1) {
    bounded.shift();
    serialized = JSON.stringify(bounded);
  }
  try {
    storage.setItem(CHAT_PREFIX + app, serialized);
    return true;
  } catch {
    return false;
  }
}

function openSecretsDatabase(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('Trình duyệt này không hỗ trợ IndexedDB để lưu khóa mã hóa cục bộ.'));
  }
  if (databasePromise) return databasePromise;
  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(SECRETS_DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(SECRETS_STORE)) {
        request.result.createObjectStore(SECRETS_STORE);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        databasePromise = null;
        encryptionKeyPromise = null;
      };
      resolve(db);
    };
    request.onerror = () => reject(request.error ?? new Error('Không mở được kho bí mật cục bộ.'));
    request.onblocked = () => reject(new Error('Kho bí mật đang bị một tab khác khóa; hãy thử lại sau.'));
  }).catch((error: unknown) => {
    databasePromise = null;
    throw error;
  });
  databasePromise = opening;
  return opening;
}

function getRecord<T>(key: IDBValidKey): Promise<T | undefined> {
  return openSecretsDatabase().then((db) => new Promise<T | undefined>((resolve, reject) => {
    const request = db.transaction(SECRETS_STORE, 'readonly').objectStore(SECRETS_STORE).get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error ?? new Error('Không đọc được kho bí mật cục bộ.'));
  }));
}

function putRecord(key: IDBValidKey, value: unknown): Promise<void> {
  return openSecretsDatabase().then((db) => new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(SECRETS_STORE, 'readwrite');
    transaction.objectStore(SECRETS_STORE).put(value, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Không lưu được kho bí mật cục bộ.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Lưu kho bí mật đã bị hủy.'));
  }));
}

function deleteRecord(key: IDBValidKey): Promise<void> {
  return openSecretsDatabase().then((db) => new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(SECRETS_STORE, 'readwrite');
    transaction.objectStore(SECRETS_STORE).delete(key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Không xóa được kho bí mật cục bộ.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Xóa kho bí mật đã bị hủy.'));
  }));
}

async function getOrCreateEncryptionKey(): Promise<CryptoKey> {
  if (!window.crypto?.subtle) {
    throw new Error('Web Crypto không khả dụng. Hãy sử dụng HTTPS để lưu khóa đã mã hóa.');
  }
  if (!encryptionKeyPromise) {
    encryptionKeyPromise = (async () => {
      const existing = await getRecord<CryptoKey>(ENCRYPTION_KEY_ID);
      if (existing && existing.type === 'secret' && existing.algorithm.name === 'AES-GCM') return existing;
      const created = await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
      );
      await putRecord(ENCRYPTION_KEY_ID, created);
      return created;
    })().catch((error) => {
      encryptionKeyPromise = null;
      throw error;
    });
  }
  return encryptionKeyPromise;
}

function apiKeyRecordId(app: AIAppId, provider: RemoteAIProvider): string {
  return 'api-key:' + app + ':' + provider;
}

interface EncryptedSecretRecord {
  version: 1;
  iv: ArrayBuffer;
  ciphertext: ArrayBuffer;
}

export async function saveRememberedApiKey(
  app: AIAppId,
  provider: RemoteAIProvider,
  apiKey: string,
): Promise<void> {
  const trimmed = apiKey.trim();
  if (!trimmed) throw new Error('Hãy nhập API key trước khi lưu.');
  if (trimmed.length > 8_192) throw new Error('API key vượt quá giới hạn độ dài.');
  const key = await getOrCreateEncryptionKey();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(trimmed);
  const ciphertext = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  await putRecord(apiKeyRecordId(app, provider), {
    version: 1,
    iv: iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength),
    ciphertext,
  } satisfies EncryptedSecretRecord);
}

export async function loadRememberedApiKey(
  app: AIAppId,
  provider: RemoteAIProvider,
): Promise<string | null> {
  const record = await getRecord<EncryptedSecretRecord>(apiKeyRecordId(app, provider));
  if (!record) return null;
  try {
    if (record.version !== 1 || !(record.iv instanceof ArrayBuffer) || !(record.ciphertext instanceof ArrayBuffer)) {
      throw new Error('Định dạng khóa đã lưu không hợp lệ.');
    }
    const key = await getRecord<CryptoKey>(ENCRYPTION_KEY_ID);
    if (!key) throw new Error('Không còn khóa mã hóa tương ứng.');
    const plaintext = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv: record.iv }, key, record.ciphertext);
    return new TextDecoder().decode(plaintext);
  } catch {
    await deleteRecord(apiKeyRecordId(app, provider));
    return null;
  }
}

export async function clearRememberedApiKey(
  app: AIAppId,
  provider: RemoteAIProvider,
): Promise<void> {
  await deleteRecord(apiKeyRecordId(app, provider));
}
