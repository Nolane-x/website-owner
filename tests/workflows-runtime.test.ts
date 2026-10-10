import { describe, expect, it } from 'vitest';
import { buildInboxTaskPayload } from '../src/lib/workflows/inbox-to-task';
import type { InboxItem } from '../src/lib/types';

describe('Inbox-to-task workflow mapping', () => {
  it('preserves the source link and captures title, description, and tags', () => {
    const item: Pick<InboxItem, 'id' | 'title' | 'textPreview' | 'sourceUri' | 'tagsJson'> = {
      id: 'inbox-source-42',
      title: 'Check authentication boundary',
      textPreview: 'Review owner checks and origin validation.',
      sourceUri: 'https://example.com/security-review',
      tagsJson: ['security', 'review'],
    };

    const payload = buildInboxTaskPayload(item);
    expect(payload).toEqual({
      title: 'Check authentication boundary',
      description: 'Review owner checks and origin validation.\nNguồn: https://example.com/security-review',
      status: 'todo',
      priority: 'medium',
      tags: ['security', 'review'],
      relatedItemId: 'inbox-source-42',
    });
  });

  it('handles missing optional content without inventing text', () => {
    const payload = buildInboxTaskPayload({
      id: 'inbox-43',
      title: 'Follow up',
      textPreview: null,
      sourceUri: null,
      tagsJson: [],
    });
    expect(payload.description).toBeNull();
    expect(payload.relatedItemId).toBe('inbox-43');
    expect(payload.tags).toEqual([]);
  });
});
