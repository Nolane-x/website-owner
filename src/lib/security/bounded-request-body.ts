export class BoundedRequestBodyTooLargeError extends Error {
  constructor(maxBytes: number) {
    super(`Nội dung yêu cầu vượt quá giới hạn ${maxBytes} byte.`);
    this.name = 'BoundedRequestBodyTooLargeError';
  }
}

export class InvalidBoundedRequestBodyError extends Error {
  constructor(message = 'Body yêu cầu không hợp lệ.') {
    super(message);
    this.name = 'InvalidBoundedRequestBodyError';
  }
}

/**
 * Read request text with a hard byte ceiling while streaming.
 *
 * Do not replace this with request.text(): that buffers the complete body
 * before the caller can enforce the limit. The declared Content-Length is an
 * early-rejection optimization only; actual streamed bytes are always counted.
 */
export async function readBoundedRequestText(request: Request, maxBytes: number): Promise<string> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new RangeError('maxBytes must be a positive safe integer.');
  }

  const rawContentLength = request.headers.get('content-length');
  if (rawContentLength !== null) {
    const contentLength = rawContentLength.trim();
    if (!/^\d+$/.test(contentLength)) {
      throw new InvalidBoundedRequestBodyError('Header Content-Length không hợp lệ.');
    }
    const declaredBytes = Number(contentLength);
    if (!Number.isSafeInteger(declaredBytes)) {
      throw new InvalidBoundedRequestBodyError('Header Content-Length không hợp lệ.');
    }
    if (declaredBytes > maxBytes) throw new BoundedRequestBodyTooLargeError(maxBytes);
  }

  const reader = request.body?.getReader();
  if (!reader) return '';

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new BoundedRequestBodyTooLargeError(maxBytes);
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof BoundedRequestBodyTooLargeError ||
        error instanceof InvalidBoundedRequestBodyError) {
      throw error;
    }
    throw new InvalidBoundedRequestBodyError('Không thể đọc body yêu cầu.');
  } finally {
    try { reader.releaseLock(); } catch { /* Reader may already be released. */ }
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new InvalidBoundedRequestBodyError('Body yêu cầu phải dùng UTF-8 hợp lệ.');
  }
}
