import { afterEach, describe, expect, it, vi } from 'vitest';

import { OpenAiCompatibleProvider } from './ai.provider.js';

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.STORYVERSE_AI_MAX_OUTPUT_TOKENS;
});

describe('OpenAiCompatibleProvider', () => {
  it('applies the configured output token limit to chat completions', async () => {
    process.env.STORYVERSE_AI_MAX_OUTPUT_TOKENS = '1200';
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        choices: [{ message: { content: 'generated text' } }],
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await new OpenAiCompatibleProvider().generate(
      {
        baseUrl: 'https://provider.test/v1',
        model: 'test-model',
        protocol: 'chat-completions',
      },
      'prompt',
    );

    expect(result).toBe('generated text');
    const request = fetchMock.mock.calls[0]?.[1];
    expect(JSON.parse(String(request?.body))).toMatchObject({ max_tokens: 1200 });
  });

  it('can request JSON object mode for structured chat completions', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        choices: [{ message: { content: '{"ok":true}' } }],
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await new OpenAiCompatibleProvider().generate(
      {
        baseUrl: 'https://provider.test/v1',
        model: 'test-model',
        protocol: 'chat-completions',
      },
      'prompt',
      { jsonMode: 'object' },
    );

    const request = fetchMock.mock.calls[0]?.[1];
    expect(JSON.parse(String(request?.body))).toMatchObject({
      response_format: { type: 'json_object' },
    });
  });

  it('applies the configured output token limit to responses', async () => {
    process.env.STORYVERSE_AI_MAX_OUTPUT_TOKENS = '900';
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ output_text: 'generated response' }));
    vi.stubGlobal('fetch', fetchMock);

    await new OpenAiCompatibleProvider().generate(
      {
        baseUrl: 'https://provider.test/v1',
        model: 'test-model',
        protocol: 'responses',
      },
      'prompt',
    );

    const request = fetchMock.mock.calls[0]?.[1];
    expect(JSON.parse(String(request?.body))).toMatchObject({ max_output_tokens: 900 });
  });
});
