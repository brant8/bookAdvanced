import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

const values = await readEnv();
const issues = [];
const warnings = [];
const strict = process.argv.includes('--strict');

if (strict && !existsSync('.env')) {
  issues.push('.env is required for a NAS deployment.');
}

if (values.STORYVERSE_AUTH_MODE === 'account') {
  if (!values.STORYVERSE_SECRET_KEY || values.STORYVERSE_SECRET_KEY.length < 32) {
    issues.push('STORYVERSE_SECRET_KEY must be at least 32 characters in account mode.');
  }
  if (values.STORYVERSE_SECRET_KEY === 'storyverse-local-development-key') {
    issues.push('STORYVERSE_SECRET_KEY is still the local development default.');
  }
} else if (strict) {
  issues.push('STORYVERSE_AUTH_MODE must be account for a NAS deployment.');
}

if (!values.STORYVERSE_DB_PASSWORD || values.STORYVERSE_DB_PASSWORD === 'storyverse_dev') {
  (strict ? issues : warnings).push(
    'STORYVERSE_DB_PASSWORD is still the local development default.',
  );
}
if (!values.STORYVERSE_DATA_DIR) {
  (strict ? issues : warnings).push(
    'STORYVERSE_DATA_DIR is not set; Docker will use a named volume.',
  );
} else if (strict && !values.STORYVERSE_DATA_DIR.startsWith('/')) {
  issues.push('STORYVERSE_DATA_DIR must be an absolute NAS path.');
}
if (!values.STORYVERSE_UPLOAD_DIR) {
  (strict ? issues : warnings).push(
    'STORYVERSE_UPLOAD_DIR is not set; Docker will use a named volume.',
  );
} else if (strict && !values.STORYVERSE_UPLOAD_DIR.startsWith('/')) {
  issues.push('STORYVERSE_UPLOAD_DIR must be an absolute NAS path.');
}
if (
  strict &&
  values.STORYVERSE_DB_BIND_ADDRESS &&
  !['127.0.0.1', 'localhost', '::1'].includes(values.STORYVERSE_DB_BIND_ADDRESS)
) {
  issues.push('STORYVERSE_DB_BIND_ADDRESS must only expose PostgreSQL on the NAS loopback.');
}
for (const name of ['STORYVERSE_WEB_PORT', 'STORYVERSE_DB_PORT']) {
  const value = values[name];
  if (value && (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65535)) {
    issues.push(`${name} must be a valid numeric port.`);
  }
}

for (const message of warnings) console.warn(`WARN: ${message}`);
if (issues.length) {
  for (const message of issues) console.error(`ERROR: ${message}`);
  process.exit(1);
}
console.log('StoryVerse NAS preflight passed.');

async function readEnv() {
  const result = {};
  if (!existsSync('.env')) return result;
  const text = await readFile('.env', 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;
    result[trimmed.slice(0, index)] = trimmed.slice(index + 1);
  }
  return result;
}
