import { describe, expect, it, vi } from 'vitest';
import { completeChat } from '../src/lib/ai/client';

describe('browser AI provider adapter', () => {
  it('sends OpenAI-compatible chat requests to the selected provider with the entered key', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: 'A grounded answer.' } }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    const result = await completeChat({
      provider: 'groq',
      apiKey: 'test-key',
      model: 'openai/gpt-oss-20b',
      messages: [{ role: 'user', content: 'Hello' }],
      fetcher,
    });

    expect(result).toBe('A grounded answer.');
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer test-key');
    expect(JSON.parse(String(init?.body)).messages).toEqual([{ role: 'user', content: 'Hello' }]);
  });

  it('supports an Ollama chat endpoint and does not require an API key', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      message: { content: 'Local model answer.' },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    const result = await completeChat({
      provider: 'ollama',
      model: 'qwen3.5:2b',
      baseUrl: 'http://127.0.0.1:11434/',
      messages: [{ role: 'user', content: 'Xin chào' }],
      fetcher,
    });

    expect(result).toBe('Local model answer.');
    expect(fetcher.mock.calls[0][0]).toBe('http://127.0.0.1:11434/api/chat');
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body)).stream).toBe(false);
  });

  it('rejects a missing API key before making a network request', async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(completeChat({
      provider: 'openai',
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Hello' }],
      fetcher,
    })).rejects.toThrow(/API key/);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('surfaces provider errors instead of claiming completion', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      error: { message: 'Model unavailable' },
    }), { status: 400, statusText: 'Bad Request', headers: { 'Content-Type': 'application/json' } }));

    await expect(completeChat({
      provider: 'openai',
      apiKey: 'test-key',
      model: 'invalid-model',
      messages: [{ role: 'user', content: 'Hello' }],
      fetcher,
    })).rejects.toThrow('Model unavailable');
  });
});
