/**
 * @file Sampler saga that snapshots per-UAV runtime values into the
 * uav-live slice at a fixed cadence.
 */

import { delay, put, select } from 'redux-saga/effects';

import { UAVAge } from '~/model/uav';
import { type RootState } from '~/store/reducers';

import { getUAVById, getUAVIdList } from '../uavs/selectors';

import { SAMPLE_INTERVAL_MS } from './constants';
import { samplesRecorded, type UAVLiveSnapshot } from './slice';

export default function* uavLiveSamplerSaga(): Generator {
  while (true) {
    yield delay(SAMPLE_INTERVAL_MS);

    const state = (yield select()) as RootState;
    const uavIds = getUAVIdList(state);

    if (uavIds.length === 0) {
      continue;
    }

    const samples: Record<string, UAVLiveSnapshot> = {};
    let anySamples = false;

    for (const uavId of uavIds) {
      const uav = getUAVById(state, uavId);
      if (!uav) continue;
      if (uav.age === UAVAge.GONE || uav.age === UAVAge.FORGOTTEN) continue;

      const snapshot: UAVLiveSnapshot = {};
      const rssi = uav.rssi?.[0];
      if (typeof rssi === 'number') {
        snapshot.rssi = rssi;
      }
      const rssiSecondary = uav.rssi?.[1];
      if (typeof rssiSecondary === 'number') {
        snapshot.rssiSecondary = rssiSecondary;
      }
      const voltage = uav.battery?.voltage;
      if (typeof voltage === 'number') {
        snapshot.voltage = voltage;
      }
      const fixType = uav.gpsFix?.type;
      if (typeof fixType === 'number') {
        snapshot.gpsFixType = fixType;
      }

      if (
        snapshot.rssi !== undefined ||
        snapshot.rssiSecondary !== undefined ||
        snapshot.voltage !== undefined ||
        snapshot.gpsFixType !== undefined
      ) {
        samples[uavId] = snapshot;
        anySamples = true;
      }
    }

    if (anySamples) {
      yield put(samplesRecorded({ now: Date.now(), samples }));
    }
  }
}
