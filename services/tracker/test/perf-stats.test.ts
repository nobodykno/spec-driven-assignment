import { describe, expect, it } from 'vitest';
import { percentile, summarize } from '../perf/stats.js';

describe('perf stats helper', () => {
  const samples = Array.from({ length: 100 }, (_, i) => i + 1);

  it('NFR-PERF-001: p95 uses the nearest-rank method', () => {
    expect(percentile(samples, 95)).toBe(95);
    expect(percentile([10, 20, 30, 40], 50)).toBe(20);
  });

  it('NFR-PERF-001: percentile sorts unsorted input without mutating it', () => {
    const input = [5, 1, 4, 2, 3];
    expect(percentile(input, 100)).toBe(5);
    expect(input).toEqual([5, 1, 4, 2, 3]);
  });

  it('NFR-PERF-001: summarize returns p50, p95 and max', () => {
    expect(summarize(samples)).toEqual({ p50: 50, p95: 95, max: 100 });
  });

  it('NFR-PERF-001: an empty sample set is rejected', () => {
    expect(() => percentile([], 95)).toThrow();
  });
});
