import { describe, expect, it, vi } from 'vitest';

import { fetchWithRetry } from './provider-http.js';

describe('fetchWithRetry', () => {
  it('retries rate limits and returns the next successful response', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('limited', { status: 429 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const response = await fetchWithRetry(
      'https://provider.test/v1/chat/completions',
      { method: 'POST' },
      { attempts: 3, baseDelayMs: 0, fetchImpl },
    );

    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('does not retry authentication or request errors', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('invalid key', { status: 401 }));

    const response = await fetchWithRetry(
      'https://provider.test/v1/chat/completions',
      { method: 'POST' },
      { attempts: 3, baseDelayMs: 0, fetchImpl },
    );

    expect(response.status).toBe(401);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('retries transient network failures', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error('connection reset'))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const response = await fetchWithRetry(
      'https://provider.test/v1/chat/completions',
      { method: 'POST' },
      { attempts: 2, baseDelayMs: 0, fetchImpl },
    );

    expect(response.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
