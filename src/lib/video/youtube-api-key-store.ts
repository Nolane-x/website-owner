import 'server-only';

import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { getDb, initializeDatabase } from '@/lib/db';
import { settings } from '@/lib/db/schema';
import { decryptAes256Gcm, encryptAes256Gcm } from '@/lib/security/secret-crypto';

const SETTING_KEY = 'youtube_api_key_encrypted';

function getEncryptionKey(): Buffer {
  const encoded = process.env.VIDEO_LIBRARY_ENCRYPTION_KEY;
  if (!encoded) throw new Error('VIDEO_LIBRARY_ENCRYPTION_KEY is not configured.');
  const key = Buffer.from(encoded, 'base64');
  if (key.byteLength !== 32 || key.toString('base64') !== encoded) {
    throw new Error('VIDEO_LIBRARY_ENCRYPTION_KEY must be a canonical base64-encoded 32-byte key.');
  }
  return key;
}

export function isValidYouTubeApiKey(value: unknown): value is string {
  return typeof value === 'string' &&
    value.trim() === value &&
    value.length >= 20 &&
    value.length <= 256 &&
    !/[^\x21-\x7e]/.test(value);
}

export async function saveYouTubeApiKey(profileId: string, apiKey: string): Promise<void> {
  if (!isValidYouTubeApiKey(apiKey)) throw new Error('YouTube API key is invalid.');
  const valueJson = encryptAes256Gcm(apiKey, getEncryptionKey());
  await initializeDatabase();
  const db = getDb();
  const now = new Date();
  await db.insert(settings).values({
    id: randomUUID(),
    profileId,
    key: SETTING_KEY,
    valueJson,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: [settings.profileId, settings.key],
    set: { valueJson, updatedAt: now },
  });
}

export async function getStoredYouTubeApiKey(profileId: string): Promise<string | null> {
  await initializeDatabase();
  const [record] = await getDb()
    .select({ valueJson: settings.valueJson })
    .from(settings)
    .where(and(
      eq(settings.profileId, profileId),
      eq(settings.key, SETTING_KEY),
    ))
    .limit(1);
  if (!record) return null;
  const apiKey = decryptAes256Gcm(record.valueJson, getEncryptionKey());
  if (!isValidYouTubeApiKey(apiKey)) throw new Error('Stored YouTube API key failed validation.');
  return apiKey;
}

export async function deleteStoredYouTubeApiKey(profileId: string): Promise<void> {
  await initializeDatabase();
  await getDb().delete(settings).where(and(
    eq(settings.profileId, profileId),
    eq(settings.key, SETTING_KEY),
  ));
}

export function maskYouTubeApiKey(apiKey: string): string {
  return '••••••••' + apiKey.slice(-4);
}
