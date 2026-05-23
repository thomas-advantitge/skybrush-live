/** How far back the rolling buffer keeps samples (ms). */
export const WINDOW_MS = 5 * 60 * 1000;

/** Interval between sampler ticks (ms). One sample per metric per UAV per tick. */
export const SAMPLE_INTERVAL_MS = 1000;

/** Hard cap on points per series, regardless of window. */
export const MAX_POINTS_PER_SERIES = Math.ceil(WINDOW_MS / SAMPLE_INTERVAL_MS);
