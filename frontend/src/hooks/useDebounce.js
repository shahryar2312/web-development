/**
 * useDebounce.js — Custom React hook that debounces a value.
 *
 * Returns the input value unchanged until it has stopped changing
 * for `delay` milliseconds. Used by the Navbar search to avoid
 * firing an API request on every keystroke.
 *
 * @param {*}      value - The value to debounce (e.g. search query string)
 * @param {number} delay - Debounce delay in milliseconds (default: 500)
 * @returns {*} The debounced value
 */
import { useState, useEffect } from 'react';

function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clear the timer if value changes before delay fires
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
