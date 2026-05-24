import { createSelector } from '@reduxjs/toolkit';

import { type RootState } from '~/store/reducers';

import { MAX_POINTS_HARD_CEILING, SAMPLE_INTERVAL_MS } from './constants';
import { type UAVLiveSeries } from './slice';

const EMPTY_BY_UAV: Record<string, UAVLiveSeries> = {};

export const getUAVLiveByUavId = (
  state: RootState
): Record<string, UAVLiveSeries> => state.uavLive?.byUavId ?? EMPTY_BY_UAV;

export const getKnownUAVLiveIds = createSelector(getUAVLiveByUavId, (byUavId) =>
  Object.keys(byUavId).sort()
);

/**
 * User-configurable trim policy for the live-charts buffer. Returns the
 * window length (in ms) and the per-series point cap, plus a flag indicating
 * whether the user opted to keep every sample.
 */
export type UAVLiveTrimPolicy = {
  windowMs: number;
  cap: number;
  keepAllData: boolean;
};

export const getUAVLiveTrimPolicy = (state: RootState): UAVLiveTrimPolicy => {
  const seconds = state.settings.uavs.liveChartWindowSeconds ?? 120;
  const keepAllData = Boolean(state.settings.uavs.liveChartKeepAllData);
  const windowMs = Math.max(1000, seconds * 1000);
  const windowCap = Math.ceil(windowMs / SAMPLE_INTERVAL_MS);
  const cap = keepAllData
    ? MAX_POINTS_HARD_CEILING
    : Math.min(windowCap, MAX_POINTS_HARD_CEILING);
  return { windowMs, cap, keepAllData };
};
