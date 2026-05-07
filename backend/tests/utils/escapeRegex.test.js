/**
 * tests/utils/escapeRegex.test.js
 *
 * Unit tests for the escapeRegex utility.
 * These are pure function tests — no DB or HTTP needed.
 */
const escapeRegex = require('../../src/utils/escapeRegex');

describe('escapeRegex()', () => {
  test('returns plain strings unchanged', () => {
    expect(escapeRegex('fortnite')).toBe('fortnite');
    expect(escapeRegex('Hello World')).toBe('Hello World');
  });

  test('escapes all special regex characters', () => {
    expect(escapeRegex('.')).toBe('\\.');
    expect(escapeRegex('*')).toBe('\\*');
    expect(escapeRegex('+')).toBe('\\+');
    expect(escapeRegex('?')).toBe('\\?');
    expect(escapeRegex('^')).toBe('\\^');
    expect(escapeRegex('$')).toBe('\\$');
    expect(escapeRegex('{')).toBe('\\{');
    expect(escapeRegex('}')).toBe('\\}');
    expect(escapeRegex('(')).toBe('\\(');
    expect(escapeRegex(')')).toBe('\\)');
    expect(escapeRegex('|')).toBe('\\|');
    expect(escapeRegex('[')).toBe('\\[');
    expect(escapeRegex(']')).toBe('\\]');
    expect(escapeRegex('\\')).toBe('\\\\');
  });

  test('escapes special chars within a real search query', () => {
    const safe = escapeRegex('C++ programming (advanced)');
    // Should not throw when used in new RegExp
    expect(() => new RegExp(safe, 'i')).not.toThrow();
  });

  test('prevents regex injection — [abc] becomes literal chars', () => {
    const malicious = '[malicious].*';
    const safe = escapeRegex(malicious);
    const regex = new RegExp(safe, 'i');
    // Should NOT match "m" (would if the input were treated as regex)
    expect(regex.test('m')).toBe(false);
    // Should match the literal string
    expect(regex.test('[malicious].*')).toBe(true);
  });

  test('handles empty string', () => {
    expect(escapeRegex('')).toBe('');
  });

  test('handles numbers and underscores without modification', () => {
    expect(escapeRegex('abc_123')).toBe('abc_123');
  });
});
