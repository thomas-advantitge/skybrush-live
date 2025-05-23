import type { RootState } from '~/store/reducers';

import type { StoredUAV } from './types';

export function getSelectedUAVIds(state: RootState): string[];
export function getUAVIdList(state: RootState): string[];
export function getUAVIdsMarkedAsGone(state: RootState): string[];
export function getUAVIdToStateMapping(
  state: RootState
): Record<string, StoredUAV>;
