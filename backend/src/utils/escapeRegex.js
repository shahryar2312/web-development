/**
 * escapeRegex.js — Escapes special regex characters in a user-supplied string.
 * Prevents regex injection when building dynamic search queries.
 *
 * @param {string} str - Raw user input
 * @returns {string} Safe string suitable for use in `new RegExp()`
 */
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = escapeRegex;
