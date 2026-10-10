import type { InboxItem } from '@/lib/types';

export interface InboxTaskPayload {
  title: string;
  description: string | null;
  status: 'todo';
  priority: 'medium';
  tags: string[];
  relatedItemId: string;
}

/** Maps one owner-scoped inbox item into a task without losing the source link. */
export function buildInboxTaskPayload(item: Pick<InboxItem, 'id' | 'title' | 'textPreview' | 'sourceUri' | 'tagsJson'>): InboxTaskPayload {
  const sourceNote = item.sourceUri ? `Nguồn: ${item.sourceUri}` : '';
  const description = [item.textPreview?.trim(), sourceNote].filter(Boolean).join('\n');
  return {
    title: item.title,
    description: description || null,
    status: 'todo',
    priority: 'medium',
    tags: Array.isArray(item.tagsJson) ? item.tagsJson : [],
    relatedItemId: item.id,
  };
}
