import { apiErrorSchema } from '@storyverse/contracts';

export async function apiRequest(path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'content-type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    const parsed = apiErrorSchema.safeParse(payload);

    throw new Error(
      parsed.success ? parsed.data.error.message : `Request failed (${response.status})`,
    );
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}
