import { randomBytes, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { and, eq } from 'drizzle-orm';

// The module is server-only at runtime; this persistence contract test runs in Vitest's Node environment.
vi.mock('server-only', () => ({}));

import { getDb, initializeDatabase } from '@/lib/db';
import { profiles, settings } from '@/lib/db/schema';
import {
  deleteStoredYouTubeApiKey,
  getStoredYouTubeApiKey,
  isValidYouTubeApiKey,
  maskYouTubeApiKey,
  saveYouTubeApiKey,
} from '@/lib/video/youtube-api-key-store';

const TEST_API_KEY = 'AIzaSyIntegrationTestKeyValue000000001';
const REPLACEMENT_API_KEY = 'AIzaSyReplacementTestKeyValue00000002';

describe('YouTube API key encrypted persistence', () => {
  const previousEncryptionKey = process.env.VIDEO_LIBRARY_ENCRYPTION_KEY;
  const encryptionKey = randomBytes(32).toString('base64');
  const profileId = `youtube-key-test-${randomUUID()}`;
  let initialized = false;

  beforeAll(async () => {
    process.env.VIDEO_LIBRARY_ENCRYPTION_KEY = encryptionKey;
    await initializeDatabase();
    initialized = true;

    await getDb().insert(profiles).values({
      id: profileId,
      username: `youtube_key_${randomUUID().slice(0, 8)}`,
      displayName: 'YouTube Key Persistence Test',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  afterAll(async () => {
    if (initialized) {
      const db = getDb();
      await db.delete(settings).where(and(
        eq(settings.profileId, profileId),
        eq(settings.key, 'youtube_api_key_encrypted'),
      ));
      await db.delete(profiles).where(eq(profiles.id, profileId));
    }

    if (previousEncryptionKey === undefined) {
      delete process.env.VIDEO_LIBRARY_ENCRYPTION_KEY;
    } else {
      process.env.VIDEO_LIBRARY_ENCRYPTION_KEY = previousEncryptionKey;
    }
  });

  it('encrypts the key before writing it to the owner-scoped settings row', async () => {
    await saveYouTubeApiKey(profileId, TEST_API_KEY);

    const [record] = await getDb()
      .select({ valueJson: settings.valueJson })
      .from(settings)
      .where(and(
        eq(settings.profileId, profileId),
        eq(settings.key, 'youtube_api_key_encrypted'),
      ));

    expect(record).toBeDefined();
    expect(JSON.stringify(record.valueJson)).not.toContain(TEST_API_KEY);
    expect(record.valueJson).toMatchObject({
      version: 1,
      algorithm: 'aes-256-gcm',
    });
    expect(await getStoredYouTubeApiKey(profileId)).toBe(TEST_API_KEY);
  });

  it('replaces the existing owner key without creating duplicate settings rows', async () => {
    await saveYouTubeApiKey(profileId, TEST_API_KEY);
    await saveYouTubeApiKey(profileId, REPLACEMENT_API_KEY);

    const records = await getDb()
      .select({ id: settings.id })
      .from(settings)
      .where(and(
        eq(settings.profileId, profileId),
        eq(settings.key, 'youtube_api_key_encrypted'),
      ));

    expect(records).toHaveLength(1);
    expect(await getStoredYouTubeApiKey(profileId)).toBe(REPLACEMENT_API_KEY);
  });

  it('does not expose another owner\'s key and deletes only the selected owner key', async () => {
    const secondProfileId = `youtube-key-other-${randomUUID()}`;
    await getDb().insert(profiles).values({
      id: secondProfileId,
      username: `youtube_other_${randomUUID().slice(0, 8)}`,
      displayName: 'Second YouTube Key Test',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    try {
      await saveYouTubeApiKey(profileId, TEST_API_KEY);
      await saveYouTubeApiKey(secondProfileId, REPLACEMENT_API_KEY);

      expect(await getStoredYouTubeApiKey(secondProfileId)).toBe(REPLACEMENT_API_KEY);
      expect(await getStoredYouTubeApiKey(`missing-${profileId}`)).toBeNull();

      await deleteStoredYouTubeApiKey(profileId);

      expect(await getStoredYouTubeApiKey(profileId)).toBeNull();
      expect(await getStoredYouTubeApiKey(secondProfileId)).toBe(REPLACEMENT_API_KEY);
    } finally {
      await getDb().delete(profiles).where(eq(profiles.id, secondProfileId));
    }
  });

  it('rejects malformed YouTube keys and non-canonical or missing encryption keys', async () => {
    expect(isValidYouTubeApiKey('short')).toBe(false);
    expect(isValidYouTubeApiKey('a'.repeat(257))).toBe(false);
    expect(isValidYouTubeApiKey('AIzaSyInvalid Key With Spaces')).toBe(false);
    expect(isValidYouTubeApiKey('AIzaSyInvalid\nLineBreakValue000000')).toBe(false);
    expect(isValidYouTubeApiKey(TEST_API_KEY)).toBe(true);

    expect(maskYouTubeApiKey(TEST_API_KEY)).toBe('••••••••0001');
    expect(maskYouTubeApiKey(TEST_API_KEY)).not.toContain(TEST_API_KEY);

    delete process.env.VIDEO_LIBRARY_ENCRYPTION_KEY;
    await expect(saveYouTubeApiKey(profileId, TEST_API_KEY))
      .rejects.toThrow('VIDEO_LIBRARY_ENCRYPTION_KEY is not configured.');

    process.env.VIDEO_LIBRARY_ENCRYPTION_KEY = 'not-canonical-base64';
    await expect(saveYouTubeApiKey(profileId, TEST_API_KEY))
      .rejects.toThrow('VIDEO_LIBRARY_ENCRYPTION_KEY must be a canonical base64-encoded 32-byte key.');

    process.env.VIDEO_LIBRARY_ENCRYPTION_KEY = encryptionKey;
    await expect(saveYouTubeApiKey(profileId, 'short'))
      .rejects.toThrow('YouTube API key is invalid.');
  });
});
