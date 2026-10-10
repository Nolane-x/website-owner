import { createHash, timingSafeEqual } from 'node:crypto';
import { canonicalJson } from './json';

export const BACKUP_ARRAY_KEYS = [
  'contentItems', 'pages', 'contentBlocks', 'contentLinks', 'contentRevisions',
  'folders', 'collections', 'collectionItems', 'inboxItems', 'kanbanTasks',
  'learningCards', 'codeSnippets', 'scratchpads', 'customWallpapers', 'vaultItems',
  'crmContacts', 'contentPipelines', 'projectGoals', 'decisionRecords', 'subscriptions',
  'researchSources', 'claims', 'automationWorkflows', 'habits', 'calendarEvents', 'settings',
] as const;

export type BackupIntegrity = {
  algorithm: 'SHA-256';
  scope: 'data';
  digest: string;
  recordCounts: Record<string, number>;
};

export function getBackupRecordCounts(data: unknown): Record<string, number> {
  const record = data && typeof data === 'object' && !Array.isArray(data)
    ? data as Record<string, unknown>
    : {};
  const counts = Object.fromEntries(BACKUP_ARRAY_KEYS.map((key) => [
    key,
    Array.isArray(record[key]) ? (record[key] as unknown[]).length : 0,
  ]));
  // Backward compatibility: older exports used creatorItems rather than contentPipelines.
  if (!Array.isArray(record.contentPipelines) && Array.isArray(record.creatorItems)) {
    counts.contentPipelines = record.creatorItems.length;
  }
  return counts;
}

export function createBackupIntegrity(data: unknown): BackupIntegrity {
  const digest = createHash('sha256').update(canonicalJson(data), 'utf8').digest('hex');
  return { algorithm: 'SHA-256', scope: 'data', digest, recordCounts: getBackupRecordCounts(data) };
}

export function verifyBackupIntegrity(data: unknown, value: unknown): value is BackupIntegrity {
  if (!value || typeof value !== 'object') return false;
  const integrity = value as Partial<BackupIntegrity>;
  if (integrity.algorithm !== 'SHA-256' || integrity.scope !== 'data' ||
      typeof integrity.digest !== 'string' || !/^[a-f0-9]{64}$/i.test(integrity.digest) ||
      !integrity.recordCounts || typeof integrity.recordCounts !== 'object') return false;

  const actual = createBackupIntegrity(data);
  const expectedDigest = Buffer.from(integrity.digest, 'hex');
  const actualDigest = Buffer.from(actual.digest, 'hex');
  if (expectedDigest.length !== actualDigest.length || !timingSafeEqual(expectedDigest, actualDigest)) return false;
  return canonicalJson(integrity.recordCounts) === canonicalJson(actual.recordCounts);
}
