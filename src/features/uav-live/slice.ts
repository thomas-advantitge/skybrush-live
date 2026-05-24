/**
 * @file Slice that stores rolling per-UAV samples (RSSI, battery voltage,
 * GPS fix type) used by the live charts panel.
 *
 * The sampler saga decides the time cutoff and point cap per dispatch (from
 * user settings) and passes them in the payload, so this slice stays
 * source-agnostic — a future server-backed source could dispatch with the
 * same shape.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { _removeUAVsByIds } from '~/features/uavs/slice';

/**
 * Native chart.js point shape — stored directly so the chart can render the
 * arrays without any per-tick `.map()` over them.
 */
export type UAVLiveSample = {
  x: number;
  y: number;
};

export type UAVLiveSeries = {
  /**
   * RSSI for `uav.rssi[0]`. In normal mode this is the only channel; in
   * Skybrush RTCM-counter mode it is the primary counter and {@link rssiSecondary}
   * holds the second.
   */
  rssi: UAVLiveSample[];
  /** RSSI for `uav.rssi[1]` — only populated when the UAV reports two values. */
  rssiSecondary: UAVLiveSample[];
  voltage: UAVLiveSample[];
  gpsFixType: UAVLiveSample[];
};

export type UAVLiveMetric = keyof UAVLiveSeries;

export type UAVLiveSnapshot = {
  rssi?: number;
  rssiSecondary?: number;
  voltage?: number;
  gpsFixType?: number;
};

type UAVLiveState = {
  byUavId: Record<string, UAVLiveSeries>;
};

const initialState: UAVLiveState = {
  byUavId: {},
};

const emptySeries = (): UAVLiveSeries => ({
  rssi: [],
  rssiSecondary: [],
  voltage: [],
  gpsFixType: [],
});

const appendAndTrim = (
  series: UAVLiveSample[],
  sample: UAVLiveSample,
  cutoff: number,
  cap: number
): void => {
  series.push(sample);

  let drop = 0;
  while (drop < series.length && series[drop]!.x < cutoff) {
    drop++;
  }
  if (drop > 0) {
    series.splice(0, drop);
  }

  const overflow = series.length - cap;
  if (overflow > 0) {
    series.splice(0, overflow);
  }
};

const { actions, reducer } = createSlice({
  name: 'uavLive',
  initialState,
  reducers: {
    samplesRecorded(
      state,
      action: PayloadAction<{
        now: number;
        cutoff: number;
        cap: number;
        samples: Record<string, UAVLiveSnapshot>;
      }>
    ) {
      const { now, cutoff, cap, samples } = action.payload;

      for (const [uavId, snapshot] of Object.entries(samples)) {
        let series = state.byUavId[uavId];
        if (!series) {
          series = emptySeries();
          state.byUavId[uavId] = series;
        }

        if (typeof snapshot.rssi === 'number') {
          appendAndTrim(series.rssi, { x: now, y: snapshot.rssi }, cutoff, cap);
        }
        if (typeof snapshot.rssiSecondary === 'number') {
          appendAndTrim(
            series.rssiSecondary,
            { x: now, y: snapshot.rssiSecondary },
            cutoff,
            cap
          );
        }
        if (typeof snapshot.voltage === 'number') {
          appendAndTrim(
            series.voltage,
            { x: now, y: snapshot.voltage },
            cutoff,
            cap
          );
        }
        if (typeof snapshot.gpsFixType === 'number') {
          appendAndTrim(
            series.gpsFixType,
            { x: now, y: snapshot.gpsFixType },
            cutoff,
            cap
          );
        }
      }
    },
  },

  extraReducers(builder) {
    builder.addCase(_removeUAVsByIds, (state, { payload: uavIds }) => {
      for (const uavId of uavIds) {
        delete state.byUavId[uavId];
      }
    });
  },
});

export const { samplesRecorded } = actions;

export default reducer;
