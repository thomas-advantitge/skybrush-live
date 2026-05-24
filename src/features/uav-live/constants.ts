/** Interval between sampler ticks (ms). One sample per metric per UAV per tick. */
export const SAMPLE_INTERVAL_MS = 1000;

/**
 * Hard ceiling on points per series, regardless of the configured window. Acts
 * as a memory safety net when `liveChartKeepAllData` is enabled or when the
 * window is set very long. At 1 sample/s this is ~2 hours of history per
 * (drone × metric).
 */
export const MAX_POINTS_HARD_CEILING = 7200;
