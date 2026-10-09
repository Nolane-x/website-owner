import { describe, it, expect } from 'vitest';
import { parseWikiLinks } from '../src/lib/knowledge/wiki-links';

describe('Second Brain & Wiki-links Engine', () => {
  it('trích xuất chính xác các thẻ wiki-link từ văn bản markdown', () => {
    const markdown = `
# Ghi chép nghiên cứu
Hôm nay tôi đã tham khảo dự án [[Hệ Thống Web OS]] và bài viết [[Kiến Trúc Microkernel]].
Ngoài ra còn có tài liệu về [[Web Audio API]] và nhắc lại [[Hệ Thống Web OS]].
    `;

    const links = parseWikiLinks(markdown);
    expect(links).toHaveLength(3);
    expect(links).toContain('Hệ Thống Web OS');
    expect(links).toContain('Kiến Trúc Microkernel');
    expect(links).toContain('Web Audio API');
  });

  it('bỏ qua văn bản không có wiki-link hoặc ngoặc đơn', () => {
    const markdown = 'Đây là [liên kết thông thường](https://example.com) và [không phải wiki link].';
    const links = parseWikiLinks(markdown);
    expect(links).toHaveLength(0);
  });

  it('xử lý chuỗi rỗng an toàn', () => {
    expect(parseWikiLinks('')).toEqual([]);
    expect(parseWikiLinks('   ')).toEqual([]);
  });
});
