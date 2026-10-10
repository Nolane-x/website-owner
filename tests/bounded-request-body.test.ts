import { describe, expect, it } from 'vitest';
import {
  BoundedRequestBodyTooLargeError,
  InvalidBoundedRequestBodyError,
  readBoundedRequestText,
} from '@/lib/security/bounded-request-body';

function makeStreamingRequest(chunks: string[], headers?: HeadersInit) {
  let index = 0;
  let cancelled = false;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index++]));
      } else {
        controller.close();
      }
    },
    cancel() {
      cancelled = true;
    },
  });
  const request = new Request('http://localhost/api/test', {
    method: 'POST',
    headers,
    body: stream,
    duplex: 'half',
  } as RequestInit & { duplex: 'half' });
  return { request, wasCancelled: () => cancelled };
}

describe('readBoundedRequestText', () => {
  it('reads UTF-8 text across chunks up to the exact byte ceiling', async () => {
    const { request } = makeStreamingRequest(['hello', ' ', 'world']);
    await expect(readBoundedRequestText(request, 11)).resolves.toBe('hello world');
  });

  it('counts encoded bytes rather than JavaScript characters', async () => {
    const { request } = makeStreamingRequest(['é']);
    await expect(readBoundedRequestText(request, 1)).rejects.toBeInstanceOf(BoundedRequestBodyTooLargeError);
    const exact = makeStreamingRequest(['é']);
    await expect(readBoundedRequestText(exact.request, 2)).resolves.toBe('é');
  });

  it('cancels an oversized streamed body before buffering the remaining chunks', async () => {
    const { request, wasCancelled } = makeStreamingRequest(['12345', '67890', 'still-not-read']);
    await expect(readBoundedRequestText(request, 8)).rejects.toBeInstanceOf(BoundedRequestBodyTooLargeError);
    expect(wasCancelled()).toBe(true);
  });

  it('rejects an oversized declared length before consuming the stream', async () => {
    const { request } = makeStreamingRequest(['{}'], { 'content-length': '100' });
    await expect(readBoundedRequestText(request, 10)).rejects.toBeInstanceOf(BoundedRequestBodyTooLargeError);
    expect(request.bodyUsed).toBe(false);
  });

  it.each(['unknown', '1.5', '-1', '9e3', '9007199254740992'])(
    'rejects malformed Content-Length %j',
    async (contentLength) => {
      const { request } = makeStreamingRequest(['{}'], { 'content-length': contentLength });
      await expect(readBoundedRequestText(request, 100)).rejects.toBeInstanceOf(InvalidBoundedRequestBodyError);
    },
  );

  it('rejects invalid UTF-8 instead of silently replacing invalid bytes', async () => {
    const request = new Request('http://localhost/api/test', {
      method: 'POST',
      body: new Uint8Array([0xff, 0xfe]),
    });
    await expect(readBoundedRequestText(request, 4)).rejects.toBeInstanceOf(InvalidBoundedRequestBodyError);
  });

  it('returns an empty string for an absent body and rejects invalid limits', async () => {
    await expect(readBoundedRequestText(new Request('http://localhost/api/test'), 100)).resolves.toBe('');
    await expect(readBoundedRequestText(new Request('http://localhost/api/test'), 0)).rejects.toThrow(RangeError);
    await expect(readBoundedRequestText(new Request('http://localhost/api/test'), Number.POSITIVE_INFINITY))
      .rejects.toThrow(RangeError);
  });
});
