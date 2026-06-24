const DEFAULT_SECRET = 'storyverse-local-development-key';

export function validateRuntimeConfig() {
  const authMode = process.env.STORYVERSE_AUTH_MODE === 'account' ? 'account' : 'local';
  const secret = process.env.STORYVERSE_SECRET_KEY ?? DEFAULT_SECRET;

  if (authMode === 'account' && (secret === DEFAULT_SECRET || secret.length < 32)) {
    throw new Error(
      'STORYVERSE_SECRET_KEY must be a unique value of at least 32 characters when STORYVERSE_AUTH_MODE=account.',
    );
  }

  if (authMode === 'account' && process.env.STORYVERSE_DB_PASSWORD === 'storyverse_dev') {
    console.warn('STORYVERSE_DB_PASSWORD is still the local development default.');
  }
}
