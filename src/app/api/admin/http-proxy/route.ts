import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { assertValidOrigin } from '@/lib/security/origin-guard';

function isPrivateIpOrHost(hostname: string): boolean {
  let lower = hostname.toLowerCase().trim().replace(/^\[|\]$/g, '');
  // F2-02: Loại bỏ trailing dots (ví dụ localhost.)
  lower = lower.replace(/\.+$/, '');

  if (
    lower === 'localhost' ||
    lower === '127.0.0.1' ||
    lower === '::1' ||
    lower === '::' ||
    lower === '0.0.0.0' ||
    lower === '169.254.169.254' ||
    lower.endsWith('.localhost') ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal') ||
    lower.endsWith('.lan') ||
    lower === 'metadata.google.internal'
  ) {
    return true;
  }

  // IPv6 private/link-local/unique local ranges
  if (lower.includes(':')) {
    if (
      lower === '::1' ||
      lower.startsWith('fe80:') ||
      lower.startsWith('fc00:') ||
      lower.startsWith('fd00:')
    ) {
      return true;
    }
    // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1)
    if (lower.startsWith('::ffff:')) {
      return isPrivateIpOrHost(lower.slice(7));
    }
  }

  // Pure integer / hex hostname notation (e.g., 2130706433 hoặc 0x7f000001 for 127.0.0.1)
  if (/^0x[0-9a-f]+$/i.test(lower) || /^\d+$/.test(lower)) {
    return true;
  }

  // F2-02: IPv4 private ranges với hỗ trợ octal (0177...), hex (0x7f...), và shorthand
  const rawParts = lower.split('.');
  if (rawParts.length >= 1 && rawParts.length <= 4) {
    const isAllNumeric = rawParts.every((p) => /^(0x[0-9a-f]+|\d+)$/i.test(p));
    if (isAllNumeric) {
      const parts = rawParts.map((p) => {
        if (/^0x/i.test(p)) return parseInt(p, 16);
        if (p.length > 1 && p.startsWith('0')) return parseInt(p, 8);
        return parseInt(p, 10);
      });
      if (parts.length === 4 && parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
        if (parts[0] === 0 || parts[0] === 127 || parts[0] === 10) return true;
        if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
        if (parts[0] === 192 && parts[1] === 168) return true;
        if (parts[0] === 169 && parts[1] === 254) return true;
      } else {
        return true;
      }
    }
  }

  return false;
}

const MAX_BODY_BYTES = 5 * 1024 * 1024; // 5 MB giới hạn tối đa tránh tấn công cạn kiệt bộ nhớ

export async function POST(req: NextRequest) {
  const originError = assertValidOrigin(req);
  if (originError) return originError;

  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    const { url, method = 'GET', headers = {}, body, timeoutMs = 10000 } = await req.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL không hợp lệ' }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Định dạng URL không hợp lệ' }, { status: 400 });
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return NextResponse.json(
        { error: 'Chỉ hỗ trợ giao thức HTTP hoặc HTTPS' },
        { status: 400 }
      );
    }

    // SSRF Guard (SEC-06): Chặn mọi địa chỉ nội bộ, link-local, loopback, private IP
    if (isPrivateIpOrHost(parsedUrl.hostname)) {
      return NextResponse.json(
        { error: 'Bảo mật: Không được phép truy vấn địa chỉ mạng nội bộ hoặc siêu dữ liệu' },
        { status: 403 }
      );
    }

    const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
    const safeMethod = validMethods.includes(String(method).toUpperCase())
      ? String(method).toUpperCase()
      : 'GET';

    const cleanHeaders: Record<string, string> = {};
    if (headers && typeof headers === 'object') {
      for (const [key, val] of Object.entries(headers)) {
        if (typeof val === 'string' && !['host', 'connection'].includes(key.toLowerCase())) {
          cleanHeaders[key] = val;
        }
      }
    }

    const safeTimeout = Math.min(Math.max(1000, Number(timeoutMs) || 10000), 30000);
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), safeTimeout);

    const startTime = performance.now();
    try {
      const fetchOptions: RequestInit = {
        method: safeMethod,
        headers: cleanHeaders,
        signal: controller.signal,
        redirect: 'manual', // F2-01: Chống redirect bypass SSRF guard
      };

      if (['POST', 'PUT', 'PATCH'].includes(safeMethod) && body !== undefined) {
        fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
      }

      const response = await fetch(parsedUrl.toString(), fetchOptions);

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        responseHeaders[key] = val;
      });

      // SEC-07: Giữ timeout bao trùm việc đọc response body và áp dụng giới hạn kích thước tối đa 5MB
      let textBody = '';
      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let receivedBytes = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            receivedBytes += value.length;
            if (receivedBytes > MAX_BODY_BYTES) {
              controller.abort();
              clearTimeout(timeoutHandle);
              return NextResponse.json(
                { error: 'Phản hồi vượt quá giới hạn cho phép (5MB)' },
                { status: 502 }
              );
            }
            textBody += decoder.decode(value, { stream: true });
          }
        }
        textBody += decoder.decode();
      }

      clearTimeout(timeoutHandle);
      const endTime = performance.now();
      const sizeBytes = Buffer.byteLength(textBody, 'utf-8');

      return NextResponse.json({
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: textBody,
        durationMs: Math.round(endTime - startTime),
        sizeBytes,
      });
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutHandle);
      const endTime = performance.now();
      const isTimeout = fetchErr instanceof Error && fetchErr.name === 'AbortError';

      return NextResponse.json(
        {
          error: isTimeout ? `Yêu cầu hết thời gian (${safeTimeout}ms)` : 'Không thể kết nối đến đích',
          details: fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
          durationMs: Math.round(endTime - startTime),
        },
        { status: 502 }
      );
    }
  } catch (err) {
    console.error('Lỗi HTTP Proxy API Tester:', err);
    return NextResponse.json({ error: 'Lỗi xử lý yêu cầu HTTP tester' }, { status: 500 });
  }
}
