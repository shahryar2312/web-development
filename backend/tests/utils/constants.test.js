/**
 * tests/utils/constants.test.js
 *
 * Sanity checks for shared constants.
 */
const { PAGE_SIZE } = require('../../src/utils/constants');

describe('constants', () => {
  test('PAGE_SIZE is a positive integer', () => {
    expect(typeof PAGE_SIZE).toBe('number');
    expect(Number.isInteger(PAGE_SIZE)).toBe(true);
    expect(PAGE_SIZE).toBeGreaterThan(0);
  });

  test('PAGE_SIZE equals 20', () => {
    expect(PAGE_SIZE).toBe(20);
  });
});
