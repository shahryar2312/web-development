/**
 * src/tests/hooks/useDebounce.test.js
 *
 * Unit tests for the useDebounce custom hook.
 * Uses renderHook() + fake timers to control time precisely.
 */
import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import useDebounce from '../../hooks/useDebounce';

describe('useDebounce()', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the initial value immediately without waiting', () => {
    const { result } = renderHook(() => useDebounce('hello', 500));
    expect(result.current).toBe('hello');
  });

  it('does not update the debounced value before the delay has elapsed', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'hello' } }
    );

    // Change the value
    rerender({ value: 'world' });

    // Advance time but NOT past the delay
    act(() => { vi.advanceTimersByTime(300); });

    // Should still be the old value
    expect(result.current).toBe('hello');
  });

  it('updates the debounced value after the full delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'hello' } }
    );

    rerender({ value: 'world' });

    act(() => { vi.advanceTimersByTime(500); });

    expect(result.current).toBe('world');
  });

  it('resets the timer when value changes rapidly (leading-edge debounce)', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'a' } }
    );

    // Rapid-fire changes
    rerender({ value: 'ab' });
    act(() => { vi.advanceTimersByTime(200); });

    rerender({ value: 'abc' });
    act(() => { vi.advanceTimersByTime(200); });

    rerender({ value: 'abcd' });
    act(() => { vi.advanceTimersByTime(200); });

    // Only 600ms total, but each rerender resets the timer.
    // The last timer was set 200ms ago — hasn't fired yet.
    expect(result.current).toBe('a');

    // Now advance past the final delay
    act(() => { vi.advanceTimersByTime(300); });

    expect(result.current).toBe('abcd');
  });

  it('uses 500ms as the default delay when no delay is specified', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: 'start' } }
    );

    rerender({ value: 'end' });

    act(() => { vi.advanceTimersByTime(499); });
    expect(result.current).toBe('start');

    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe('end');
  });

  it('works correctly with numeric values', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 0 } }
    );

    rerender({ value: 42 });
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current).toBe(42);
  });

  it('cleans up the timer on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    const { unmount } = renderHook(() => useDebounce('test', 500));
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
