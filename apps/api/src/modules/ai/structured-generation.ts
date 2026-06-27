import type { AiProviderConfig } from '@storyverse/contracts';

import { AiProviderError, type TextGenerationProvider } from './ai.provider.js';

export async function generateStructured<T>(
  provider: TextGenerationProvider,
  config: AiProviderConfig,
  prompt: string,
  parse: (output: string) => T,
  options: { jsonMode?: 'object' } = {},
): Promise<T> {
  const attempts = structuredAttempts();
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const output = await provider.generate(
        config,
        attempt === 1
          ? prompt
          : `${prompt}\n\n上一次输出不是有效的目标 JSON。请重新生成完整 JSON，不要解释、注释或 Markdown。`,
        options,
      );
      try {
        return parse(output);
      } catch (cause) {
        lastError = cause;
      }
    } catch (cause) {
      if (!isEmptyOutputError(cause)) throw cause;
      lastError = cause;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('AI output was not valid JSON.');
}

function structuredAttempts(): number {
  const parsed = Number.parseInt(process.env.STORYVERSE_AI_STRUCTURED_RETRY_ATTEMPTS ?? '2', 10);
  return Number.isFinite(parsed) ? Math.min(3, Math.max(1, parsed)) : 2;
}

function isEmptyOutputError(cause: unknown): boolean {
  return (
    cause instanceof AiProviderError &&
    cause.message === 'Provider response did not contain generated text.'
  );
}
