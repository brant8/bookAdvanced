export const PROJECT_NAME_MAX_LENGTH = 80;
export const PROJECT_STYLE_SAMPLE_LIMIT = 3;

export function normalizeProjectName(value: string): string {
  const normalized = value.trim().replace(/\s+/g, ' ');

  if (normalized.length === 0) {
    throw new Error('Project name cannot be empty.');
  }

  if (normalized.length > PROJECT_NAME_MAX_LENGTH) {
    throw new Error(`Project name cannot exceed ${PROJECT_NAME_MAX_LENGTH} characters.`);
  }

  return normalized;
}

export function normalizeStyleSamples(samples: string[]): string[] {
  const normalized = samples.map((sample) => sample.trim()).filter(Boolean);

  if (normalized.length > PROJECT_STYLE_SAMPLE_LIMIT) {
    throw new Error(`A project can have at most ${PROJECT_STYLE_SAMPLE_LIMIT} style samples.`);
  }

  return normalized;
}

export * from './generation';
