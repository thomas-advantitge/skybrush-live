import React from 'react';

import { BaseLayerSettings, BaseLayer } from './base';
import { BeaconsLayer } from './beacons';
import { DocksLayer } from './docks';
import { FeaturesLayer } from './features';
import { GeoJSONLayerSettings, GeoJSONLayer } from './geojson';
import { GraticuleLayer } from './graticule';
import { HeatmapLayerSettings, HeatmapLayer } from './heatmap';
import { HexGridLayerSettings, HexGridLayer } from './hexgrid';
import { MissionInfoLayerSettings, MissionInfoLayer } from './mission-info';
import { OwnLocationLayer } from './ownlocation';
import { TileServerLayerSettings, TileServerLayer } from './tileserver';
import { UAVsLayerSettings, UAVsLayer } from './uavs';
import { UAVTraceLayerSettings, UAVTraceLayer } from './uavtrace';
import { UntypedLayerSettings, UntypedLayer } from './untyped';

import { LayerType } from '~/model/layers';

export const LayerSettings = {
  [LayerType.BASE]: BaseLayerSettings,
  [LayerType.GEOJSON]: GeoJSONLayerSettings,
  [LayerType.HEATMAP]: HeatmapLayerSettings,
  [LayerType.HEXGRID]: HexGridLayerSettings,
  [LayerType.MISSION_INFO]: MissionInfoLayerSettings,
  [LayerType.TILE_SERVER]: TileServerLayerSettings,
  [LayerType.UAVS]: UAVsLayerSettings,
  [LayerType.UAV_TRACE]: UAVTraceLayerSettings,
  [LayerType.UNTYPED]: UntypedLayerSettings,
};

export const stateObjectToLayerSettings = (layer, layerId) => {
  if (!(layer.type in LayerSettings)) {
    throw new Error(
      `Cannot render settings for nonexistent layer type (${layer.type}).`
    );
  }

  const CurrentLayerSettings = LayerSettings[layer.type];
  return (
    <CurrentLayerSettings
      key={`${layerId}_settings`}
      layer={layer}
      layerId={layerId}
    />
  );
};

export const Layers = {
  [LayerType.BASE]: BaseLayer,
  [LayerType.BEACONS]: BeaconsLayer,
  [LayerType.DOCKS]: DocksLayer,
  [LayerType.FEATURES]: FeaturesLayer,
  [LayerType.GEOJSON]: GeoJSONLayer,
  [LayerType.GRATICULE]: GraticuleLayer,
  [LayerType.HEATMAP]: HeatmapLayer,
  [LayerType.HEXGRID]: HexGridLayer,
  [LayerType.MISSION_INFO]: MissionInfoLayer,
  [LayerType.OWN_LOCATION]: OwnLocationLayer,
  [LayerType.TILE_SERVER]: TileServerLayer,
  [LayerType.UAVS]: UAVsLayer,
  [LayerType.UAV_TRACE]: UAVTraceLayer,
  [LayerType.UNTYPED]: UntypedLayer,
};

export const stateObjectToLayer = (layer, props) => {
  if (!(layer.type in Layers)) {
    throw new Error(
      `Nonexistent layer type (${layer.type}) cannot be rendered.`
    );
  }

  const CurrentLayer = Layers[layer.type];
  return (
    <CurrentLayer
      key={`${layer.id}_rendered`}
      {...props}
      layer={layer}
      layerId={layer.id}
    />
  );
};
