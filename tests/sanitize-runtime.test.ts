import { describe, expect, it } from 'vitest';
import { sanitizeHtml, sanitizePlain } from '../src/lib/security/sanitize';

describe('Server-safe shared sanitization runtime', () => {
  it('removes executable markup and event-handler attributes while preserving safe content', () => {
    const result = sanitizeHtml(
      '<p onclick="alert(1)">safe content</p><script>alert(2)</script><a href="javascript:alert(3)">link</a>',
    );

    expect(result).toContain('safe content');
    expect(result.toLowerCase()).not.toContain('<script');
    expect(result.toLowerCase()).not.toContain('onclick');
    expect(result.toLowerCase()).not.toContain('javascript:');
  });

  it('keeps plain-text cleanup independent of HTML parsing semantics', () => {
    expect(sanitizePlain('Task <draft> & notes')).toBe('Task draft & notes');
    expect(sanitizePlain('')).toBe('');
  });
});
