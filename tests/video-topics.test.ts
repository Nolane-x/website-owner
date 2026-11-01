import { describe, expect, it } from 'vitest';
import { VIDEO_TOPIC_GROUPS, VIDEO_TOPICS } from '@/lib/video/video-topics';

describe('Video topic discovery catalogue', () => {
  it('contains unique topics with searchable queries and valid groups', () => {
    const ids = VIDEO_TOPICS.map((topic) => topic.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(VIDEO_TOPICS.length).toBeGreaterThanOrEqual(12);

    for (const topic of VIDEO_TOPICS) {
      expect(topic.label.trim().length).toBeGreaterThan(0);
      expect(topic.description.trim().length).toBeGreaterThan(0);
      expect(topic.query.length).toBeGreaterThanOrEqual(2);
      expect(topic.query.length).toBeLessThanOrEqual(120);
      expect(VIDEO_TOPIC_GROUPS).toContain(topic.group);
    }
  });
});
