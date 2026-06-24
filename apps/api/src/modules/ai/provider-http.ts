const RETRYABLE_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  fetchImpl?: typeof fetch;
}

export async function fetchWithRetry(
  input: string | URL,
  init: RequestInit,
  options: RetryOptions = {},
): Promise<Response> {
  const attempts = options.attempts ?? envNumber('STORYVERSE_AI_RETRY_ATTEMPTS', 3, 1, 5);
  const baseDelayMs =
    options.baseDelayMs ?? envNumber('STORYVERSE_AI_RETRY_BASE_DELAY_MS', 500, 0, 10_000);
  const fetchImpl = options.fetchImpl ?? fetch;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(input, init);
      if (!RETRYABLE_STATUS.has(response.status) || attempt === attempts) return response;
      await response.body?.cancel();
    } catch (cause) {
      lastError = cause;
      if (attempt === attempts) throw cause;
    }
    await delay(baseDelayMs * 2 ** (attempt - 1));
  }

  throw lastError instanceof Error ? lastError : new Error('AI provider request failed.');
}

export function maxOutputTokens(): number {
  return envNumber('STORYVERSE_AI_MAX_OUTPUT_TOKENS', 4096, 256, 32_768);
}

function envNumber(name: string, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
