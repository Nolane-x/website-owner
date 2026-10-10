import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { assertValidOrigin } from '@/lib/security/origin-guard';
import { BoundedRequestBodyTooLargeError, readBoundedRequestText } from '@/lib/security/bounded-request-body';
import {
  requestPublicHttp,
  OutboundInvalidHeaderError,
  OutboundPayloadTooLargeError,
  OutboundRequestTimeoutError,
  OutboundResponseTooLargeError,
  OutboundTargetDeniedError,
  OutboundTargetResolutionError,
} from '@/lib/security/http-target';

export const runtime = 'nodejs';

const MAX_REQUEST_BYTES = 1024 * 1024;
const MAX_HEADER_COUNT = 100;
const MAX_HEADER_BYTES = 32 * 1024;
const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

class RequestBodyTooLargeError extends Error {}
class InvalidRequestJsonError extends Error {}

async function readBoundedJson(req: NextRequest): Promise<unknown> {
  let raw: string;
  try {
    raw = await readBoundedRequestText(req, MAX_REQUEST_BYTES);
  } catch (error) {
    if (error instanceof BoundedRequestBodyTooLargeError) throw new RequestBodyTooLargeError();
    throw new InvalidRequestJsonError();
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new InvalidRequestJsonError();
  }
}

export async function POST(req: NextRequest) {
  const originError = assertValidOrigin(req);
  if (originError) return originError;

  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  let payload: unknown;
  try {
    payload = await readBoundedJson(req);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: 'Dữ liệu yêu cầu vượt quá giới hạn 1MB.' }, { status: 413 });
    }
    return NextResponse.json({ error: 'Body yêu cầu phải là JSON hợp lệ.' }, { status: 400 });
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return NextResponse.json({ error: 'Body yêu cầu phải là một object JSON.' }, { status: 400 });
  }

  const input = payload as Record<string, unknown>;
  const url = input.url;
  if (typeof url !== 'string' || !url.trim() || url.length > 4096) {
    return NextResponse.json({ error: 'URL không hợp lệ hoặc vượt quá 4096 ký tự.' }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Định dạng URL không hợp lệ.' }, { status: 400 });
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return NextResponse.json({ error: 'Chỉ hỗ trợ giao thức HTTP hoặc HTTPS.' }, { status: 400 });
  }

  const rawMethod = input.method === undefined ? 'GET' : input.method;
  if (typeof rawMethod !== 'string' || !ALLOWED_METHODS.has(rawMethod.toUpperCase())) {
    return NextResponse.json({ error: 'Phương thức HTTP không được hỗ trợ.' }, { status: 400 });
  }
  const method = rawMethod.toUpperCase();

  const rawHeaders = input.headers === undefined ? {} : input.headers;
  if (!rawHeaders || typeof rawHeaders !== 'object' || Array.isArray(rawHeaders)) {
    return NextResponse.json({ error: 'Headers phải là một object JSON.' }, { status: 400 });
  }

  const headerEntries = Object.entries(rawHeaders);
  if (headerEntries.length > MAX_HEADER_COUNT) {
    return NextResponse.json({ error: 'Tối đa 100 HTTP headers cho mỗi yêu cầu.' }, { status: 400 });
  }

  const cleanHeaders: Record<string, string> = {};
  let headerBytes = 0;
  for (const [key, value] of headerEntries) {
    if (!key.trim()) continue;
    if (typeof value !== 'string') {
      return NextResponse.json({ error: 'Giá trị header "' + key + '" phải là chuỗi.' }, { status: 400 });
    }
    headerBytes += Buffer.byteLength(key, 'utf8') + Buffer.byteLength(value, 'utf8');
    if (headerBytes > MAX_HEADER_BYTES) {
      return NextResponse.json({ error: 'Tổng kích thước HTTP headers vượt quá 32KB.' }, { status: 400 });
    }
    cleanHeaders[key.trim()] = value;
  }

  const requestedTimeout = Number(input.timeoutMs);
  const safeTimeout = Number.isFinite(requestedTimeout) && requestedTimeout > 0
    ? Math.min(Math.max(1000, requestedTimeout), 30000)
    : 10000;

  let outboundBody: string | undefined;
  if (['POST', 'PUT', 'PATCH'].includes(method) && input.body !== undefined) {
    outboundBody = typeof input.body === 'string' ? input.body : JSON.stringify(input.body);
  }

  try {
    const result = await requestPublicHttp({
      url: parsedUrl,
      method,
      headers: cleanHeaders,
      body: outboundBody,
      timeoutMs: safeTimeout,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof OutboundTargetDeniedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof OutboundRequestTimeoutError) {
      return NextResponse.json({ error: error.message }, { status: 504 });
    }
    if (error instanceof OutboundTargetResolutionError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    if (error instanceof OutboundPayloadTooLargeError) {
      return NextResponse.json({ error: error.message }, { status: 413 });
    }
    if (error instanceof OutboundResponseTooLargeError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    if (error instanceof OutboundInvalidHeaderError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Do not expose low-level network errors, destination internals, or resolver details.
    return NextResponse.json({ error: 'Không thể kết nối đến đích HTTP công cộng.' }, { status: 502 });
  }
}
