export type RemoteAIProvider =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'groq'
  | 'deepseek'
  | 'openrouter'
  | 'mistral'
  | 'together'
  | 'fireworks'
  | 'xai'
  | 'cerebras'
  | 'perplexity'
  | 'cohere'
  | 'nvidia'
  | 'sambanova'
  | 'siliconflow'
  | 'huggingface'
  | 'deepinfra'
  | 'hyperbolic'
  | 'novita'
  | 'nebius'
  | 'ollama'
  | 'lmstudio'
  | 'vllm'
  | 'llamacpp'
  | 'litellm'
  | 'custom';

export type ChatRole = 'system' | 'user' | 'assistant';
export interface ChatMessageInput { role: ChatRole; content: string }
type AIProtocol = 'openai-compatible' | 'anthropic' | 'ollama';

export interface AIProviderPreset {
  id: RemoteAIProvider;
  label: string;
  protocol: AIProtocol;
  defaultBaseUrl: string;
  defaultModel: string;
  requiresApiKey: boolean;
  category: 'cloud' | 'local' | 'custom';
  description: string;
}

export const AI_PROVIDER_PRESETS: readonly AIProviderPreset[] = [
  { id: 'openai', label: 'OpenAI', protocol: 'openai-compatible', defaultBaseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4.1-mini', requiresApiKey: true, category: 'cloud', description: 'OpenAI Chat Completions API.' },
  { id: 'anthropic', label: 'Anthropic Claude', protocol: 'anthropic', defaultBaseUrl: 'https://api.anthropic.com/v1', defaultModel: 'claude-sonnet-4-5', requiresApiKey: true, category: 'cloud', description: 'Native Messages API; direct browser access depends on provider CORS policy.' },
  { id: 'gemini', label: 'Google Gemini', protocol: 'openai-compatible', defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', defaultModel: 'gemini-3.8-flash', requiresApiKey: true, category: 'cloud', description: 'Gemini through Google’s OpenAI-compatible endpoint.' },
  { id: 'groq', label: 'Groq', protocol: 'openai-compatible', defaultBaseUrl: 'https://api.groq.com/openai/v1', defaultModel: 'openai/gpt-oss-20b', requiresApiKey: true, category: 'cloud', description: 'Fast inference with an OpenAI-compatible endpoint.' },
  { id: 'deepseek', label: 'DeepSeek', protocol: 'openai-compatible', defaultBaseUrl: 'https://api.deepseek.com', defaultModel: 'deepseek-flash', requiresApiKey: true, category: 'cloud', description: 'DeepSeek API, OpenAI-compatible chat format.' },
  { id: 'openrouter', label: 'OpenRouter', protocol: 'openai-compatible', defaultBaseUrl: 'https://openrouter.ai/api/v1', defaultModel: 'openai/gpt-4.1-mini', requiresApiKey: true, category: 'cloud', description: 'One API for models from multiple providers.' },
  { id: 'mistral', label: 'Mistral AI', protocol: 'openai-compatible', defaultBaseUrl: 'https://api.mistral.ai/v1', defaultModel: 'mistral-small-latest', requiresApiKey: true, category: 'cloud', description: 'Mistral chat completions.' },
  { id: 'together', label: 'Together AI', protocol: 'openai-compatible', defaultBaseUrl: 'https://api.together.xyz/v1', defaultModel: 'openai/gpt-oss-20b', requiresApiKey: true, category: 'cloud', description: 'Hosted open-weight models.' },
  { id: 'fireworks', label: 'Fireworks AI', protocol: 'openai-compatible', defaultBaseUrl: 'https://api.fireworks.ai/inference/v1', defaultModel: 'accounts/fireworks/models/deepseek-v3p1', requiresApiKey: true, category: 'cloud', description: 'Serverless inference with OpenAI-compatible chat.' },
  { id: 'xai', label: 'xAI / Grok', protocol: 'openai-compatible', defaultBaseUrl: 'https://api.x.ai/v1', defaultModel: 'grok-4-1-fast-reasoning', requiresApiKey: true, category: 'cloud', description: 'xAI inference API.' },
  { id: 'cerebras', label: 'Cerebras', protocol: 'openai-compatible', defaultBaseUrl: 'https://api.cerebras.ai/v1', defaultModel: 'gpt-oss-120b', requiresApiKey: true, category: 'cloud', description: 'Cerebras inference API.' },
  { id: 'perplexity', label: 'Perplexity', protocol: 'openai-compatible', defaultBaseUrl: 'https://api.perplexity.ai', defaultModel: 'sonar', requiresApiKey: true, category: 'cloud', description: 'Sonar models and search-grounded responses.' },
  { id: 'cohere', label: 'Cohere', protocol: 'openai-compatible', defaultBaseUrl: 'https://api.cohere.ai/compatibility/v1', defaultModel: 'command-a-plus-05-2026', requiresApiKey: true, category: 'cloud', description: 'Cohere Compatibility API.' },
  { id: 'nvidia', label: 'NVIDIA NIM', protocol: 'openai-compatible', defaultBaseUrl: 'https://integrate.api.nvidia.com/v1', defaultModel: 'meta/llama-3.3-70b-instruct', requiresApiKey: true, category: 'cloud', description: 'NVIDIA-hosted inference endpoints.' },
  { id: 'sambanova', label: 'SambaNova', protocol: 'openai-compatible', defaultBaseUrl: 'https://api.sambanova.ai/v1', defaultModel: 'DeepSeek-V3.1', requiresApiKey: true, category: 'cloud', description: 'SambaNova hosted inference.' },
  { id: 'siliconflow', label: 'SiliconFlow', protocol: 'openai-compatible', defaultBaseUrl: 'https://api.siliconflow.com/v1', defaultModel: 'Qwen/Qwen3-8B', requiresApiKey: true, category: 'cloud', description: 'SiliconFlow model inference.' },
  { id: 'huggingface', label: 'Hugging Face Router', protocol: 'openai-compatible', defaultBaseUrl: 'https://router.huggingface.co/v1', defaultModel: 'openai/gpt-oss-20b', requiresApiKey: true, category: 'cloud', description: 'Hugging Face Inference Providers router.' },
  { id: 'deepinfra', label: 'DeepInfra', protocol: 'openai-compatible', defaultBaseUrl: 'https://api.deepinfra.com/v1/openai', defaultModel: 'openai/gpt-oss-120b', requiresApiKey: true, category: 'cloud', description: 'Hosted open-weight and frontier models.' },
  { id: 'hyperbolic', label: 'Hyperbolic', protocol: 'openai-compatible', defaultBaseUrl: 'https://api.hyperbolic.xyz/v1', defaultModel: 'deepseek-ai/DeepSeek-V3.1', requiresApiKey: true, category: 'cloud', description: 'Open-model inference API.' },
  { id: 'novita', label: 'Novita AI', protocol: 'openai-compatible', defaultBaseUrl: 'https://api.novita.ai/v3/openai', defaultModel: 'deepseek/deepseek-v3.1', requiresApiKey: true, category: 'cloud', description: 'Novita OpenAI-compatible endpoint.' },
  { id: 'nebius', label: 'Nebius AI Studio', protocol: 'openai-compatible', defaultBaseUrl: 'https://api.studio.nebius.com/v1', defaultModel: 'Qwen/Qwen3-235B-A22B', requiresApiKey: true, category: 'cloud', description: 'Nebius hosted foundation models.' },
  { id: 'ollama', label: 'Ollama', protocol: 'ollama', defaultBaseUrl: 'http://localhost:11434', defaultModel: 'qwen3.5:2b', requiresApiKey: false, category: 'local', description: 'Local Ollama server; no API key required.' },
  { id: 'lmstudio', label: 'LM Studio', protocol: 'openai-compatible', defaultBaseUrl: 'http://localhost:1234/v1', defaultModel: 'local-model', requiresApiKey: false, category: 'local', description: 'Local OpenAI-compatible server in LM Studio.' },
  { id: 'vllm', label: 'vLLM', protocol: 'openai-compatible', defaultBaseUrl: 'http://localhost:8000/v1', defaultModel: 'local-model', requiresApiKey: false, category: 'local', description: 'Self-hosted vLLM OpenAI-compatible server.' },
  { id: 'llamacpp', label: 'llama.cpp server', protocol: 'openai-compatible', defaultBaseUrl: 'http://localhost:8080/v1', defaultModel: 'local-model', requiresApiKey: false, category: 'local', description: 'Local llama.cpp server.' },
  { id: 'litellm', label: 'LiteLLM gateway', protocol: 'openai-compatible', defaultBaseUrl: 'http://localhost:4000/v1', defaultModel: 'local-model', requiresApiKey: false, category: 'local', description: 'Self-hosted LiteLLM gateway; enter a key if your gateway requires one.' },
  { id: 'custom', label: 'Custom OpenAI-compatible endpoint', protocol: 'openai-compatible', defaultBaseUrl: '', defaultModel: '', requiresApiKey: false, category: 'custom', description: 'Any service implementing /chat/completions and optionally /models.' },
] as const;

export interface ChatCompletionOptions {
  provider: RemoteAIProvider;
  apiKey?: string;
  model: string;
  baseUrl?: string;
  messages: ChatMessageInput[];
  signal?: AbortSignal;
  fetcher?: typeof fetch;
}

export interface ListModelsOptions {
  provider: RemoteAIProvider;
  apiKey?: string;
  baseUrl?: string;
  signal?: AbortSignal;
  fetcher?: typeof fetch;
}

export function getAIProviderPreset(provider: RemoteAIProvider): AIProviderPreset {
  return AI_PROVIDER_PRESETS.find((preset) => preset.id === provider) ?? AI_PROVIDER_PRESETS[AI_PROVIDER_PRESETS.length - 1];
}

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error('Hãy nhập Base URL của provider trước khi kết nối.');
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error('Base URL không hợp lệ. Hãy nhập URL đầy đủ gồm https:// hoặc http://localhost.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Base URL chỉ hỗ trợ giao thức HTTP hoặc HTTPS.');
  }
  if (url.username || url.password) {
    throw new Error('Không nhúng username/password trong Base URL. Hãy dùng trường API key riêng.');
  }
  if (url.search || url.hash) {
    throw new Error('Base URL không được chứa query string hoặc fragment; hãy đặt API key trong trường riêng.');
  }
  const host = url.hostname.toLowerCase();
  const isLoopback = host === 'localhost' || host === '[::1]' || host === '::1' || /^127(?:\.\d{1,3}){3}$/.test(host);
  if (url.protocol === 'http:' && !isLoopback) {
    throw new Error('Endpoint bên ngoài phải dùng HTTPS. HTTP chỉ được cho phép với localhost/loopback.');
  }
  return url.toString().replace(/\/+$/, '');
}

function requireKeyIfNeeded(provider: RemoteAIProvider, apiKey?: string): string {
  const preset = getAIProviderPreset(provider);
  const key = apiKey?.trim() ?? '';
  if (preset.requiresApiKey && !key) {
    throw new Error(`${preset.label} yêu cầu API key. Key chỉ được giữ trong phiên và không được lưu bởi Personal Web OS.`);
  }
  return key;
}

function authHeaders(provider: RemoteAIProvider, apiKey: string): Record<string, string> {
  const preset = getAIProviderPreset(provider);
  if (preset.protocol === 'anthropic') {
    return {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    };
  }
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
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

async function fetchWithTimeout(fetcher: typeof fetch, url: string, init: RequestInit, timeoutMs = 60_000): Promise<Response> {
  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort(new DOMException('Yêu cầu AI quá thời gian chờ.', 'TimeoutError')), timeoutMs);
  const signal = init.signal
    ? AbortSignal.any([init.signal, timeoutController.signal])
    : timeoutController.signal;
  try {
    return await fetcher(url, { ...init, signal });
  } finally {
    clearTimeout(timeout);
  }
}

function readTextContent(content: unknown): string {
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => part && typeof part === 'object' && 'text' in part ? (part as { text?: unknown }).text : '')
      .filter((part): part is string => typeof part === 'string')
      .join('\n')
      .trim();
  }
  return '';
}

/** Sends requests directly to the user's selected provider; API keys are never persisted by this app. */
export async function completeChat(options: ChatCompletionOptions): Promise<string> {
  const model = options.model.trim();
  if (!model) throw new Error('Bạn cần nhập model ID hoặc tải danh sách model từ provider.');
  const apiKey = requireKeyIfNeeded(options.provider, options.apiKey);
  const preset = getAIProviderPreset(options.provider);
  const baseUrl = normalizeBaseUrl(options.baseUrl || preset.defaultBaseUrl);
  const fetcher = options.fetcher ?? fetch;
  let response: Response;

  if (preset.protocol === 'ollama') {
    response = await fetchWithTimeout(fetcher, `${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: options.signal,
      body: JSON.stringify({ model, messages: options.messages, stream: false }),
    });
  } else if (preset.protocol === 'anthropic') {
    const system = options.messages.filter((message) => message.role === 'system').map((message) => message.content).join('\n\n');
    const messages = options.messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({ role: message.role, content: message.content }));
    if (!messages.some((message) => message.role === 'user')) {
      throw new Error('Anthropic cần ít nhất một message user.');
    }
    const body: Record<string, unknown> = { model, max_tokens: 4096, messages, stream: false };
    if (system) body.system = system;
    response = await fetchWithTimeout(fetcher, `${baseUrl}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(options.provider, apiKey) },
      signal: options.signal,
      body: JSON.stringify(body),
    });
  } else {
    response = await fetchWithTimeout(fetcher, `${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(options.provider, apiKey) },
      signal: options.signal,
      body: JSON.stringify({ model, messages: options.messages, stream: false }),
    });
  }

  if (!response.ok) throw new Error(await readError(response));
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== 'object') {
    throw new Error('Phản hồi của model không phải JSON hợp lệ.');
  }

  if (preset.protocol === 'ollama') {
    const content = (payload as { message?: { content?: unknown } }).message?.content;
    if (typeof content === 'string' && content.trim()) return content.trim();
  } else if (preset.protocol === 'anthropic') {
    const content = readTextContent((payload as { content?: unknown }).content);
    if (content) return content;
  } else {
    const choices = (payload as { choices?: Array<{ message?: { content?: unknown } }> }).choices;
    const content = readTextContent(choices?.[0]?.message?.content);
    if (content) return content;
  }
  throw new Error('Model đã phản hồi nhưng không có phần nội dung văn bản có thể hiển thị.');
}

/** Lists models via the selected provider's compatible models endpoint, without storing the key. */
export async function listChatModels(options: ListModelsOptions): Promise<string[]> {
  const preset = getAIProviderPreset(options.provider);
  const apiKey = requireKeyIfNeeded(options.provider, options.apiKey);
  const baseUrl = normalizeBaseUrl(options.baseUrl || preset.defaultBaseUrl);
  const fetcher = options.fetcher ?? fetch;

  const response = preset.protocol === 'ollama'
    ? await fetchWithTimeout(fetcher, `${baseUrl}/api/tags`, {
      method: 'GET', headers: { Accept: 'application/json' }, signal: options.signal,
    })
    : await fetchWithTimeout(fetcher, `${baseUrl}/models`, {
      method: 'GET',
      headers: { Accept: 'application/json', ...authHeaders(options.provider, apiKey) },
      signal: options.signal,
    });

  if (!response.ok) throw new Error(await readError(response));
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== 'object') throw new Error('Provider trả về danh sách model không hợp lệ.');
  const record = payload as { data?: unknown; models?: unknown };
  const rawModels = preset.protocol === 'ollama' ? record.models : record.data ?? record.models;
  if (!Array.isArray(rawModels)) throw new Error('Provider không hỗ trợ định dạng danh sách model tiêu chuẩn. Hãy nhập Model ID thủ công.');
  const models = rawModels.map((item) => {
    if (!item || typeof item !== 'object') return '';
    const entry = item as { id?: unknown; name?: unknown; model?: unknown };
    const value = typeof entry.id === 'string' ? entry.id : typeof entry.name === 'string' ? entry.name : entry.model;
    return typeof value === 'string' ? value.trim() : '';
  }).filter(Boolean);
  return [...new Set(models)].sort((a, b) => a.localeCompare(b)).slice(0, 500);
}
