export type RemoteAIProvider = 'openai' | 'groq' | 'ollama';
export type ChatRole = 'system' | 'user' | 'assistant';
export interface ChatMessageInput { role: ChatRole; content: string }
export interface ChatCompletionOptions {
  provider: RemoteAIProvider;
  apiKey?: string;
  model: string;
  baseUrl?: string;
  messages: ChatMessageInput[];
  signal?: AbortSignal;
  fetcher?: typeof fetch;
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

async function readError(response: Response): Promise<string> {
  try {
    const payload: unknown = await response.json();
    if (payload && typeof payload === 'object') {
      const obj = payload as { error?: unknown; message?: unknown };
      if (typeof obj.error === 'string') return obj.error;
      if (obj.error && typeof obj.error === 'object' && 'message' in obj.error) {
        const message = (obj.error as { message?: unknown }).message;
        if (typeof message === 'string') return message;
      }
      if (typeof obj.message === 'string') return obj.message;
    }
  } catch {
    // Providers sometimes return non-JSON error text.
  }
  return `Nhà cung cấp trả về HTTP ${response.status} ${response.statusText}.`;
}

/** Sends a real request directly from the browser; this helper never persists API keys. */
export async function completeChat(options: ChatCompletionOptions): Promise<string> {
  const model = options.model.trim();
  if (!model) throw new Error('Bạn cần nhập model ID.');
  if (options.provider !== 'ollama' && !options.apiKey?.trim()) {
    throw new Error('Nhà cung cấp này yêu cầu API key. Khóa chỉ dùng trong phiên hiện tại, không được lưu bởi ứng dụng.');
  }

  const fetcher = options.fetcher ?? fetch;
  const defaultUrl = options.provider === 'groq'
    ? 'https://api.groq.com/openai/v1'
    : options.provider === 'ollama'
    ? 'http://localhost:11434'
    : 'https://api.openai.com/v1';
  const baseUrl = normalizeBaseUrl(options.baseUrl || defaultUrl);

  let response: Response;
  if (options.provider === 'ollama') {
    response = await fetcher(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: options.signal,
      body: JSON.stringify({ model, messages: options.messages, stream: false }),
    });
  } else {
    response = await fetcher(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${options.apiKey!.trim()}`,
      },
      signal: options.signal,
      body: JSON.stringify({ model, messages: options.messages, stream: false }),
    });
  }

  if (!response.ok) throw new Error(await readError(response));
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== 'object') {
    throw new Error('Phản hồi của model không phải JSON hợp lệ.');
  }

  if (options.provider === 'ollama') {
    const content = (payload as { message?: { content?: unknown } }).message?.content;
    if (typeof content === 'string' && content.trim()) return content.trim();
  } else {
    const choices = (payload as { choices?: Array<{ message?: { content?: unknown } }> }).choices;
    const content = choices?.[0]?.message?.content;
    if (typeof content === 'string' && content.trim()) return content.trim();
    if (Array.isArray(content)) {
      const joined = content
        .map((part) => part && typeof part === 'object' && 'text' in part ? (part as { text?: unknown }).text : '')
        .filter((part): part is string => typeof part === 'string')
        .join('\n')
        .trim();
      if (joined) return joined;
    }
  }
  throw new Error('Model đã phản hồi nhưng không có phần nội dung văn bản có thể hiển thị.');
}
