import { createSelector } from '@reduxjs/toolkit';

import { type RootState } from '~/store/reducers';

import { type UAVLiveSeries } from './slice';

const EMPTY_BY_UAV: Record<string, UAVLiveSeries> = {};

export const getUAVLiveByUavId = (
  state: RootState
): Record<string, UAVLiveSeries> =>
  state.uavLive?.byUavId ?? EMPTY_BY_UAV;

export const getUAVLiveWindowMs = (state: RootState): number =>
  state.uavLive?.windowMs ?? 0;

export const getKnownUAVLiveIds = createSelector(
  getUAVLiveByUavId,
  (byUavId) => Object.keys(byUavId).sort()
);
