import { afterEach, describe, expect, it, vi } from 'vitest';

import type { TextGenerationProvider } from './ai.provider.js';
import { AiProviderError } from './ai.provider.js';
import { generateStructured } from './structured-generation.js';

afterEach(() => {
  delete process.env.STORYVERSE_AI_STRUCTURED_RETRY_ATTEMPTS;
});

describe('generateStructured', () => {
  it('retries invalid JSON with a stricter correction prompt', async () => {
    const generate = vi
      .fn<TextGenerationProvider['generate']>()
      .mockResolvedValueOnce('not json')
      .mockResolvedValueOnce('{"ok":true}');

    const result = await generateStructured(
      { generate },
      { baseUrl: 'https://provider.test/v1', model: 'test', protocol: 'chat-completions' },
      'Return JSON.',
      (output) => JSON.parse(output) as { ok: boolean },
    );

    expect(result.ok).toBe(true);
    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate.mock.calls[1]?.[1]).toContain('上一次输出不是有效的目标 JSON');
  });

  it('retries an empty provider response but not authentication errors', async () => {
    const emptyThenValid = vi
      .fn<TextGenerationProvider['generate']>()
      .mockRejectedValueOnce(
        new AiProviderError('Provider response did not contain generated text.'),
      )
      .mockResolvedValueOnce('{"ok":true}');
    await expect(
      generateStructured(
        { generate: emptyThenValid },
        { baseUrl: 'https://provider.test/v1', model: 'test', protocol: 'chat-completions' },
        'Return JSON.',
        JSON.parse,
      ),
    ).resolves.toEqual({ ok: true });

    const unauthorized = vi
      .fn<TextGenerationProvider['generate']>()
      .mockRejectedValue(new AiProviderError('Provider returned 401: invalid key'));
    await expect(
      generateStructured(
        { generate: unauthorized },
        { baseUrl: 'https://provider.test/v1', model: 'test', protocol: 'chat-completions' },
        'Return JSON.',
        JSON.parse,
      ),
    ).rejects.toThrow('401');
    expect(unauthorized).toHaveBeenCalledOnce();
  });
});
