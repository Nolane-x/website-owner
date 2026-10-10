import { describe, expect, it, vi } from 'vitest';
import {
  AI_PROVIDER_PRESETS,
  completeChat,
  getAIProviderPreset,
  listChatModels,
  type RemoteAIProvider,
} from '../src/lib/ai/client';

const messages = [{ role: 'user' as const, content: 'Hello' }];
const jsonResponse = (value: unknown, status = 200, statusText = 'OK') => new Response(JSON.stringify(value), {
  status,
  statusText,
  headers: { 'Content-Type': 'application/json' },
});

describe('multi-provider AI adapters', () => {
  it('registers a broad catalog with cloud, local/self-hosted and custom endpoints', () => {
    expect(AI_PROVIDER_PRESETS.length).toBeGreaterThanOrEqual(25);
    expect(AI_PROVIDER_PRESETS.some((provider) => provider.id === 'anthropic' && provider.protocol === 'anthropic')).toBe(true);
    expect(AI_PROVIDER_PRESETS.some((provider) => provider.id === 'gemini')).toBe(true);
    expect(AI_PROVIDER_PRESETS.some((provider) => provider.id === 'openrouter')).toBe(true);
    expect(AI_PROVIDER_PRESETS.some((provider) => provider.id === 'custom' && provider.category === 'custom')).toBe(true);
    expect(AI_PROVIDER_PRESETS.filter((provider) => provider.category === 'cloud').length).toBeGreaterThanOrEqual(18);
  });

  it('sends OpenAI-compatible chat requests to the selected provider with the entered key', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({
      choices: [{ message: { content: 'A grounded answer.' } }],
    }));

    const result = await completeChat({
      provider: 'groq',
      apiKey: 'test-key',
      model: 'openai/gpt-oss-20b',
      messages,
      fetcher,
    });

    expect(result).toBe('A grounded answer.');
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer test-key');
    expect(JSON.parse(String(init?.body)).messages).toEqual(messages);
  });

  it.each([
    ['openai', 'https://api.openai.com/v1/chat/completions'],
    ['gemini', 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'],
    ['deepseek', 'https://api.deepseek.com/chat/completions'],
    ['openrouter', 'https://openrouter.ai/api/v1/chat/completions'],
    ['mistral', 'https://api.mistral.ai/v1/chat/completions'],
    ['together', 'https://api.together.xyz/v1/chat/completions'],
    ['fireworks', 'https://api.fireworks.ai/inference/v1/chat/completions'],
    ['xai', 'https://api.x.ai/v1/chat/completions'],
    ['cerebras', 'https://api.cerebras.ai/v1/chat/completions'],
    ['perplexity', 'https://api.perplexity.ai/chat/completions'],
    ['cohere', 'https://api.cohere.ai/compatibility/v1/chat/completions'],
    ['nvidia', 'https://integrate.api.nvidia.com/v1/chat/completions'],
    ['sambanova', 'https://api.sambanova.ai/v1/chat/completions'],
    ['siliconflow', 'https://api.siliconflow.com/v1/chat/completions'],
    ['huggingface', 'https://router.huggingface.co/v1/chat/completions'],
    ['deepinfra', 'https://api.deepinfra.com/v1/openai/chat/completions'],
    ['hyperbolic', 'https://api.hyperbolic.xyz/v1/chat/completions'],
    ['novita', 'https://api.novita.ai/v3/openai/chat/completions'],
    ['nebius', 'https://api.studio.nebius.com/v1/chat/completions'],
  ] as const)('%s uses its configured OpenAI-compatible endpoint', async (provider, expectedUrl) => {
    const preset = getAIProviderPreset(provider as RemoteAIProvider);
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({
      choices: [{ message: { content: 'Compatible answer.' } }],
    }));

    const result = await completeChat({
      provider: provider as RemoteAIProvider,
      apiKey: 'test-key',
      model: preset.defaultModel,
      messages,
      fetcher,
    });

    expect(result).toBe('Compatible answer.');
    expect(fetcher.mock.calls[0][0]).toBe(expectedUrl);
  });

  it('supports Anthropic Messages API including the system prompt and browser opt-in header', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({
      content: [{ type: 'text', text: 'Claude answer.' }],
    }));

    const result = await completeChat({
      provider: 'anthropic',
      apiKey: 'anthropic-test-key',
      model: 'claude-sonnet-4-5',
      baseUrl: 'https://api.anthropic.com/v1/',
      messages: [
        { role: 'system', content: 'Be precise.' },
        { role: 'user', content: 'Explain adapters.' },
      ],
      fetcher,
    });

    const [url, init] = fetcher.mock.calls[0];
    expect(result).toBe('Claude answer.');
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect((init?.headers as Record<string, string>)['x-api-key']).toBe('anthropic-test-key');
    expect((init?.headers as Record<string, string>)['anthropic-dangerous-direct-browser-access']).toBe('true');
    expect(JSON.parse(String(init?.body))).toMatchObject({
      system: 'Be precise.',
      max_tokens: 4096,
      messages: [{ role: 'user', content: 'Explain adapters.' }],
    });
  });

  it('supports Ollama native chat and local model listing without an API key', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ message: { content: 'Local model answer.' } }))
      .mockResolvedValueOnce(jsonResponse({ models: [{ name: 'qwen3.5:2b' }, { name: 'llama3.2:3b' }] }));

    const result = await completeChat({
      provider: 'ollama',
      model: 'qwen3.5:2b',
      baseUrl: 'http://127.0.0.1:11434/',
      messages,
      fetcher,
    });
    const models = await listChatModels({
      provider: 'ollama',
      baseUrl: 'http://127.0.0.1:11434',
      fetcher,
    });

    expect(result).toBe('Local model answer.');
    expect(fetcher.mock.calls[0][0]).toBe('http://127.0.0.1:11434/api/chat');
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body)).stream).toBe(false);
    expect(fetcher.mock.calls[1][0]).toBe('http://127.0.0.1:11434/api/tags');
    expect(models).toEqual(['llama3.2:3b', 'qwen3.5:2b']);
  });

  it('loads models from OpenAI-compatible APIs and rejects unsupported list formats clearly', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({
      data: [{ id: 'model-z' }, { id: 'model-a' }, { id: 'model-a' }, { name: 'ignored-name' }],
    }));
    const models = await listChatModels({ provider: 'openrouter', apiKey: 'router-key', fetcher });

    expect(fetcher.mock.calls[0][0]).toBe('https://openrouter.ai/api/v1/models');
    expect((fetcher.mock.calls[0][1]?.headers as Record<string, string>).Authorization).toBe('Bearer router-key');
    expect(models).toEqual(['ignored-name', 'model-a', 'model-z']);
  });

  it('explains when a custom endpoint does not provide a standard model list', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ result: ['model-a'] }));
    await expect(listChatModels({ provider: 'custom', baseUrl: 'https://llm.example.test/v1', fetcher }))
      .rejects.toThrow(/nhập Model ID thủ công/i);
  });

  it('allows an unauthenticated custom compatible endpoint when explicitly configured', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({
      choices: [{ message: { content: 'Self-hosted answer.' } }],
    }));

    const result = await completeChat({
      provider: 'custom',
      model: 'local-model',
      baseUrl: 'https://llm.example.test/v1/',
      messages,
      fetcher,
    });

    expect(result).toBe('Self-hosted answer.');
    expect(fetcher.mock.calls[0][0]).toBe('https://llm.example.test/v1/chat/completions');
    expect((fetcher.mock.calls[0][1]?.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('requires API keys for cloud providers before making any network request', async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(completeChat({
      provider: 'openai',
      model: 'gpt-4.1-mini',
      messages,
      fetcher,
    })).rejects.toThrow(/API key/);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    'file:///etc/passwd',
    'https://user:password@example.com/v1',
    'https://provider.example/v1?api_key=leak',
    'http://provider.example/v1',
  ])('rejects unsafe endpoint URL %s', async (baseUrl) => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(completeChat({
      provider: 'custom',
      apiKey: 'custom-key',
      model: 'my-model',
      baseUrl,
      messages,
      fetcher,
    })).rejects.toThrow(/Base URL|HTTPS|query string/);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('surfaces provider errors instead of claiming completion', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({
      error: { message: 'Model unavailable' },
    }, 400, 'Bad Request'));

    await expect(completeChat({
      provider: 'openai',
      apiKey: 'test-key',
      model: 'invalid-model',
      messages,
      fetcher,
    })).rejects.toThrow('Model unavailable');
  });
});
