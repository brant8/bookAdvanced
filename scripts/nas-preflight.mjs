import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

const values = await readEnv();
const issues = [];
const warnings = [];

if (values.STORYVERSE_AUTH_MODE === 'account') {
  if (!values.STORYVERSE_SECRET_KEY || values.STORYVERSE_SECRET_KEY.length < 32) {
    issues.push('STORYVERSE_SECRET_KEY must be at least 32 characters in account mode.');
  }
  if (values.STORYVERSE_SECRET_KEY === 'storyverse-local-development-key') {
    issues.push('STORYVERSE_SECRET_KEY is still the local development default.');
  }
}

if (!values.STORYVERSE_DB_PASSWORD || values.STORYVERSE_DB_PASSWORD === 'storyverse_dev') {
  warnings.push('STORYVERSE_DB_PASSWORD is still the local development default.');
}
if (!values.STORYVERSE_DATA_DIR) {
  warnings.push('STORYVERSE_DATA_DIR is not set; Docker will use a named volume.');
}
if (!values.STORYVERSE_UPLOAD_DIR) {
  warnings.push('STORYVERSE_UPLOAD_DIR is not set; Docker will use a named volume.');
}
for (const name of ['STORYVERSE_WEB_PORT', 'STORYVERSE_DB_PORT']) {
  const value = values[name];
  if (value && !/^\d+$/.test(value)) issues.push(`${name} must be a numeric port.`);
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
