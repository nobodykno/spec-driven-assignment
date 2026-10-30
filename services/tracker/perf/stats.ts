export interface Summary {
  p50: number;
  p95: number;
  max: number;
}

/** Nearest-rank percentile (p in 1..100) of the samples; the input array is not modified. */
export function percentile(samples: number[], p: number): number {
  if (samples.length === 0) {
    throw new Error('no samples');
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil((p * sorted.length) / 100));
  return sorted[rank - 1] as number;
}

export function summarize(samples: number[]): Summary {
  return { p50: percentile(samples, 50), p95: percentile(samples, 95), max: Math.max(...samples) };
}
