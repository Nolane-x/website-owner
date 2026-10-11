import { describe, expect, it, vi } from 'vitest';
import { createSingleFlight } from '@/lib/db/single-flight';

describe('database initialization single-flight', () => {
  it('shares one initialization promise between concurrent callers', async () => {
    const result = { ready: true };
    const task = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      return result;
    });
    const initialize = createSingleFlight(task);

    const values = await Promise.all(Array.from({ length: 12 }, () => initialize()));

    expect(task).toHaveBeenCalledTimes(1);
    expect(values.every((value) => value === result)).toBe(true);
  });

  it('allows a later retry after initialization fails', async () => {
    const failure = new Error('transient database failure');
    const task = vi.fn()
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce('ready');
    const initialize = createSingleFlight(task);

    await expect(initialize()).rejects.toBe(failure);
    await expect(initialize()).resolves.toBe('ready');
    expect(task).toHaveBeenCalledTimes(2);
  });
});
