import { describe, expect, it } from 'vitest';

import { normalizeProjectName, normalizeStyleSamples } from './index';

describe('normalizeProjectName', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeProjectName('  星海   纪元  ')).toBe('星海 纪元');
  });

  it('rejects an empty name', () => {
    expect(() => normalizeProjectName('   ')).toThrow('Project name cannot be empty.');
  });
});

describe('normalizeStyleSamples', () => {
  it('trims samples and removes empty values', () => {
    expect(normalizeStyleSamples(['  示例一  ', '', ' 示例二'])).toEqual(['示例一', '示例二']);
  });
});
