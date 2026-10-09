import { describe, it, expect } from 'vitest';
import {
  formatJson,
  minifyJson,
  generateUuid,
  testRegex,
  hashString,
  convertTimestamp,
} from '../src/lib/dev-tools/converters';

describe('Developer Studio - Offline Utilities & Converters', () => {
  it('định dạng và nén chuỗi JSON chính xác', () => {
    const raw = '{"name":"WebOS","version":3,"active":true}';
    const formatted = formatJson(raw, 2);
    expect(formatted.success).toBe(true);
    expect(formatted.data).toContain('\n  "name": "WebOS"');

    const minified = minifyJson(formatted.data || '');
    expect(minified.success).toBe(true);
    expect(minified.data).toBe(raw);

    const invalid = formatJson('{invalid_json}');
    expect(invalid.success).toBe(false);
    expect(invalid.error).toBeDefined();
  });

  it('sinh mã định danh UUID v4 và v7', () => {
    const uuidsV4 = generateUuid('v4', 3);
    expect(uuidsV4.length).toBe(3);
    expect(uuidsV4[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

    const uuidsV7 = generateUuid('v7', 2);
    expect(uuidsV7.length).toBe(2);
    expect(uuidsV7[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('kiểm tra và khớp biểu thức chính quy (Regex)', () => {
    const res = testRegex('([a-zA-Z0-9]+)@([a-zA-Z0-9.]+)', 'g', 'Liên hệ test@example.com hoặc dev@webos.vn');
    expect(res.matches.length).toBe(2);
    expect(res.matches[0]).toBe('test@example.com');
    expect(res.matches[1]).toBe('dev@webos.vn');

    const invalid = testRegex('[a-z(', 'g', 'abc');
    expect(invalid.error).toBeDefined();
  });

  it('tạo mã băm Crypto an toàn (SHA-256, MD5, Base64)', () => {
    const text = 'WebOS-Executive-Suite';
    const sha256 = hashString(text, 'sha256');
    expect(sha256).toHaveLength(64);

    const md5 = hashString(text, 'md5');
    expect(md5).toHaveLength(32);

    const base64 = hashString(text, 'base64');
    expect(Buffer.from(base64, 'base64').toString('utf-8')).toBe(text);
  });

  it('chuyển đổi định dạng timestamp và thời gian tương đối', () => {
    const fixedTs = 1775700000000; // ISO ms
    const res = convertTimestamp(fixedTs);
    expect(res.unixMs).toBe(fixedTs);
    expect(res.unixSeconds).toBe(1775700000);
    expect(res.iso).toBe(new Date(fixedTs).toISOString());
  });
});
