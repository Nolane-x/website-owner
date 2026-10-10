import { NextResponse } from 'next/server';
import { InboxValidationError, INBOX_REQUEST_MAX_BYTES } from '@/lib/inbox/validation';

export class InboxPayloadTooLargeError extends Error {}

export async function readInboxJsonBody(req: Request): Promise<unknown> {
  const contentLength = req.headers.get('content-length');
  if (contentLength && /^\d+$/.test(contentLength) && Number(contentLength) > INBOX_REQUEST_MAX_BYTES) {
    throw new InboxPayloadTooLargeError('Nội dung yêu cầu vượt quá 64 KiB.');
  }

  const rawBody = await req.text();
  if (new TextEncoder().encode(rawBody).byteLength > INBOX_REQUEST_MAX_BYTES) {
    throw new InboxPayloadTooLargeError('Nội dung yêu cầu vượt quá 64 KiB.');
  }
  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw new InboxValidationError('Nội dung yêu cầu không phải JSON hợp lệ.');
  }
}

export function inboxValidationErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof InboxPayloadTooLargeError) {
    return NextResponse.json({ error: error.message }, { status: 413 });
  }
  if (error instanceof InboxValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return null;
}
