import type { AiProviderConfig } from '@storyverse/contracts';

export interface TextGenerationProvider {
  generate(config: AiProviderConfig, prompt: string): Promise<string>;
}

export class OpenAiCompatibleProvider implements TextGenerationProvider {
  async generate(config: AiProviderConfig, prompt: string): Promise<string> {
    const baseUrl = config.baseUrl.replace(/\/+$/, '');
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (config.apiKey) headers.authorization = `Bearer ${config.apiKey}`;

    const isResponses = config.protocol === 'responses';
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${isResponses ? '/responses' : '/chat/completions'}`, {
        body: JSON.stringify(
          isResponses
            ? { input: prompt, model: config.model }
            : {
                messages: [{ content: prompt, role: 'user' }],
                model: config.model,
                temperature: 0.7,
              },
        ),
        headers,
        method: 'POST',
        signal: AbortSignal.timeout(180_000),
      });
    } catch (cause) {
      throw new AiProviderError(
        `Could not connect to AI provider: ${cause instanceof Error ? cause.message : 'unknown error'}`,
      );
    }

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      throw new AiProviderError(`Provider returned ${response.status}: ${detail}`);
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const text = isResponses ? readResponsesText(payload) : readChatText(payload);
    if (!text) throw new AiProviderError('Provider response did not contain generated text.');
    return text;
  }
}

export class AiProviderError extends Error {}

function readChatText(payload: Record<string, unknown>): string | null {
  const choices = payload.choices;
  if (!Array.isArray(choices)) return null;
  const message = (choices[0] as { message?: { content?: unknown } } | undefined)?.message;
  return typeof message?.content === 'string' ? message.content : null;
}

function readResponsesText(payload: Record<string, unknown>): string | null {
  if (typeof payload.output_text === 'string') return payload.output_text;
  const output = payload.output;
  if (!Array.isArray(output)) return null;
  for (const item of output) {
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      const text = (part as { text?: unknown }).text;
      if (typeof text === 'string') return text;
    }
  }
  return null;
}
