import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { assertValidOrigin } from '@/lib/security/origin-guard';

function isPrivateIpOrHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (
    lower === 'localhost' ||
    lower === '127.0.0.1' ||
    lower === '::1' ||
    lower === '0.0.0.0' ||
    lower === '169.254.169.254'
  ) {
    return true;
  }

  // IPv4 private ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16
  const parts = lower.split('.').map(Number);
  if (parts.length === 4 && parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
  }

  return false;
}

export async function POST(req: NextRequest) {
  await assertValidOrigin(req);
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

    // SSRF Guard
    if (process.env.NODE_ENV === 'production' && isPrivateIpOrHost(parsedUrl.hostname)) {
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
      };

      if (['POST', 'PUT', 'PATCH'].includes(safeMethod) && body !== undefined) {
        fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
      }

      const response = await fetch(parsedUrl.toString(), fetchOptions);
      clearTimeout(timeoutHandle);
      const endTime = performance.now();

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        responseHeaders[key] = val;
      });

      const textBody = await response.text();
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
