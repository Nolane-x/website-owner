import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../src/lib/backup/json';
import {
  createBackupIntegrity,
  getBackupRecordCounts,
  verifyBackupIntegrity,
} from '../src/lib/backup/integrity';

describe('backup integrity', () => {
  it('uses stable key ordering and JSON-normalized dates', () => {
    const first = { z: 1, a: { y: true, x: 'ok' }, at: new Date('2026-01-02T03:04:05.000Z') };
    const second = { at: '2026-01-02T03:04:05.000Z', a: { x: 'ok', y: true }, z: 1 };
    expect(canonicalJson(first)).toBe(canonicalJson(second));
    expect(createBackupIntegrity(first).digest).toBe(createBackupIntegrity(second).digest);
  });

  it('detects record edits and rejects malformed or stale count manifests', () => {
    const data = { contentItems: [{ id: 'a', title: 'before' }], pages: [] };
    const integrity = createBackupIntegrity(data);
    expect(verifyBackupIntegrity(data, integrity)).toBe(true);
    expect(verifyBackupIntegrity({ contentItems: [{ id: 'a', title: 'after' }], pages: [] }, integrity)).toBe(false);
    expect(verifyBackupIntegrity(data, { ...integrity, recordCounts: { ...integrity.recordCounts, pages: 1 } })).toBe(false);
    expect(verifyBackupIntegrity(data, { algorithm: 'SHA-1', scope: 'data', digest: integrity.digest, recordCounts: integrity.recordCounts })).toBe(false);
  });

  it('reports all known collections and treats malformed collections as empty', () => {
    const counts = getBackupRecordCounts({ contentItems: [{ id: 1 }], pages: 'not-an-array', habits: [1, 2] });
    expect(counts.contentItems).toBe(1);
    expect(counts.pages).toBe(0);
    expect(counts.habits).toBe(2);
    expect(Object.keys(counts).length).toBeGreaterThan(20);
  });
});
