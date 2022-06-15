import { combineReducers } from 'redux';

import dialogsReducer from './dialogs';
import mapReducer from './map';

import alertReducer from '~/features/alert/slice';
import beaconsReducer from '~/features/beacons/slice';
import clocksReducer from '~/features/clocks/slice';
import connectionsReducer from '~/features/connections/slice';
import datasetsReducer from '~/features/datasets/slice';
import docksReducer from '~/features/docks/slice';
import hotkeysReducer from '~/features/hotkeys/slice';
import lcdClockReducer from '~/features/lcd-clock/slice';
import localServerReducer from '~/features/local-server/slice';
import licenseInfoReducer from '~/features/license-info/slice';
import lightControlReducer from '~/features/light-control/slice';
import logReducer from '~/features/log/slice';
import mapCachingReducer from '~/features/map-caching/slice';
import featuresReducer from '~/features/map-features/slice';
import featureEditorReducer from '~/features/map-features/editor';
import measurementReducer from '~/features/measurement/slice';
import messagesReducer from '~/features/messages/slice';
import missionReducer from '~/features/mission/slice';
import parametersReducer from '~/features/parameters/slice';
import preflightReducer from '~/features/preflight/slice';
import rtkReducer from '~/features/rtk/slice';
import savedLocationsReducer from '~/features/saved-locations/slice';
import savedLocationEditorReducer from '~/features/saved-locations/editor';
import serversReducer from '~/features/servers/slice';
import sessionReducer from '~/features/session/slice';
import settingsReducer from '~/features/settings/slice';
import sidebarReducer from '~/features/sidebar/slice';
import showReducer from '~/features/show/slice';
import snackbarReducer from '~/features/snackbar/slice';
import threeDReducer from '~/features/three-d/slice';
import tourReducer from '~/features/tour/slice';
import uavReducer from '~/features/uavs/slice';
import uploadReducer from '~/features/upload/slice';
import uavControlReducer from '~/features/uav-control/slice';
import versionCheckReducer from '~/features/version-check/slice';
import weatherReducer from '~/features/weather/slice';
import workbenchReducer from '~/features/workbench/slice';

/**
 * The global reducer of the application.
 */
const reducer = combineReducers({
  alert: alertReducer,
  beacons: beaconsReducer,
  clocks: clocksReducer,
  connections: connectionsReducer,
  datasets: datasetsReducer,
  dialogs: dialogsReducer,
  docks: docksReducer,
  features: featuresReducer,
  featureEditor: featureEditorReducer,
  hotkeys: hotkeysReducer,
  lcdClock: lcdClockReducer,
  licenseInfo: licenseInfoReducer,
  lightControl: lightControlReducer,
  localServer: localServerReducer,
  log: logReducer,
  map: mapReducer,
  mapCaching: mapCachingReducer,
  measurement: measurementReducer,
  messages: messagesReducer,
  mission: missionReducer,
  parameters: parametersReducer,
  preflight: preflightReducer,
  rtk: rtkReducer,
  savedLocations: savedLocationsReducer,
  savedLocationEditor: savedLocationEditorReducer,
  servers: serversReducer,
  session: sessionReducer,
  settings: settingsReducer,
  show: showReducer,
  sidebar: sidebarReducer,
  snackbar: snackbarReducer,
  threeD: threeDReducer,
  tour: tourReducer,
  uavs: uavReducer,
  uavControl: uavControlReducer,
  upload: uploadReducer,
  versionCheck: versionCheckReducer,
  weather: weatherReducer,
  workbench: workbenchReducer,
});

export default reducer;
