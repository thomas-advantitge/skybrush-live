import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import type {
  Chart,
  ChartData,
  ChartDataset,
  ChartOptions,
  Plugin,
  TooltipItem,
} from 'chart.js';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useHarmonicIntervalFn, useUpdate } from 'react-use';

import { defaultFont, isThemeDark } from '@skybrush/app-theme-mui';
import { BackgroundHint } from '@skybrush/mui-components';

import { setSelectedUAVIds } from '~/features/uavs/actions';
import { getSelectedUAVIds } from '~/features/uavs/selectors';
import { abbreviateGPSFixType, GPSFixType } from '~/model/enums';
import { useAppDispatch } from '~/store/hooks';

import { WINDOW_MS } from '~/features/uav-live/constants';
import {
  getKnownUAVLiveIds,
  getUAVLiveByUavId,
  getUAVLiveWindowMs,
} from '~/features/uav-live/selectors';
import type {
  UAVLiveMetric,
  UAVLiveSeries,
} from '~/features/uav-live/slice';

import LineChart from './LineChart';

const OUTLIER_COUNT = 5;

/**
 * Deterministic per-drone color. Numeric IDs are spread by the golden angle
 * so consecutive drones get maximally distinct hues; non-numeric IDs fall
 * back to a string hash.
 */
const GOLDEN_ANGLE_DEG = 137.508;
const colorForUavId = (uavId: string): string => {
  let n = Number.parseInt(uavId, 10);
  if (!Number.isFinite(n)) {
    n = 0;
    for (let i = 0; i < uavId.length; i++) {
      n = (n * 31 + uavId.charCodeAt(i)) | 0;
    }
  }
  const hue = (Math.abs(n) * GOLDEN_ANGLE_DEG) % 360;
  return `hsl(${hue}, 65%, 55%)`;
};

type Severity = 'normal' | 'outlier' | 'selected';

type SeriesPoint = { x: number; y: number };

type EndLabelDataset = ChartDataset<'line', SeriesPoint[]> & {
  _sev?: Severity;
  /** True for the first series of a multi-series chart — used to dedupe labels. */
  _isPrimary?: boolean;
};

const GPS_FIX_TYPE_ORDER: GPSFixType[] = [
  GPSFixType.NO_GPS,
  GPSFixType.NO_FIX,
  GPSFixType.FIX_2D,
  GPSFixType.FIX_3D,
  GPSFixType.DGPS,
  GPSFixType.RTK_FLOAT,
  GPSFixType.RTK_FIXED,
  GPSFixType.STATIC,
];

const formatRelativeSeconds = (deltaMs: number): string => {
  const absSec = Math.round(Math.abs(deltaMs) / 1000);
  if (absSec === 0) return 'now';
  if (absSec < 60) return `-${absSec}s`;
  const m = Math.floor(absSec / 60);
  const s = absSec % 60;
  return s === 0 ? `-${m}m` : `-${m}m${s}s`;
};

const computeSeverity = (
  cfg: MetricConfig,
  uavIds: string[],
  byUavId: Record<string, UAVLiveSeries>,
  selectedSet: Set<string>
): Map<string, Severity> => {
  const result = new Map<string, Severity>();

  // For each UAV, take the worst (lowest) latest value across all this chart's
  // series — so a drone counts as an outlier when ANY of its channels is bad.
  const latest: Array<{ id: string; v: number }> = [];
  for (const id of uavIds) {
    let min = Infinity;
    let any = false;
    for (const key of cfg.seriesKeys) {
      const series = byUavId[id]?.[key];
      if (!series || series.length === 0) continue;
      const last = series[series.length - 1]!.y;
      if (last < min) min = last;
      any = true;
    }
    if (any) latest.push({ id, v: min });
  }

  const outliers = new Set<string>();

  if (cfg.absoluteOutlier) {
    for (const { id, v } of latest) {
      if (cfg.absoluteOutlier(v)) outliers.add(id);
    }
  }

  if (cfg.divergenceThreshold !== undefined && latest.length > 0) {
    const sorted = latest.slice().sort((a, b) => a.v - b.v);
    const median = sorted[Math.floor(sorted.length / 2)]!.v;
    const cutoff = median - cfg.divergenceThreshold;
    const k = Math.min(OUTLIER_COUNT, sorted.length);
    for (let i = 0; i < k; i++) {
      if (sorted[i]!.v < cutoff) outliers.add(sorted[i]!.id);
    }
  }

  for (const id of uavIds) {
    if (selectedSet.has(id)) result.set(id, 'selected');
    else if (outliers.has(id)) result.set(id, 'outlier');
    else result.set(id, 'normal');
  }
  return result;
};

const buildDatasets = (
  cfg: MetricConfig,
  byUavId: Record<string, UAVLiveSeries>,
  uavIds: string[],
  severity: Map<string, Severity>
): EndLabelDataset[] => {
  const datasets: EndLabelDataset[] = [];
  for (const uavId of uavIds) {
    const series = byUavId[uavId];
    if (!series) continue;

    const sev = severity.get(uavId) ?? 'normal';
    const color = colorForUavId(uavId);
    const width = sev === 'selected' ? 3 : sev === 'outlier' ? 2 : 1;
    const order = sev === 'selected' ? -10 : sev === 'outlier' ? -1 : 1;

    for (let s = 0; s < cfg.seriesKeys.length; s++) {
      const key = cfg.seriesKeys[s]!;
      const samples = series[key];
      if (!samples || samples.length === 0) continue;
      const isSecondary = s > 0;

      datasets.push({
        label: uavId,
        // Pass the slice's array directly. With `parsing: false` chart.js
        // iterates it as-is, so no per-render allocation.
        data: samples,
        borderColor: color,
        backgroundColor: color,
        borderWidth: width,
        borderDash: isSecondary ? [4, 3] : undefined,
        pointRadius: 0,
        pointHoverRadius: 4,
        stepped: key === 'gpsFixType',
        spanGaps: true,
        order,
        _sev: sev,
        _isPrimary: !isSecondary,
      });
    }
  }
  return datasets;
};

const endLabelPlugin: Plugin<'line'> = {
  id: 'endLabel',
  afterDatasetsDraw(chart) {
    const ctx = chart.ctx;
    const area = chart.chartArea;
    ctx.save();
    ctx.font = `11px ${defaultFont}, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    // Avoid overlapping labels: place each label at the line's end y, but if
    // a previous label was placed within 14px vertically, nudge this one down.
    // In multi-series charts, only label the primary series per drone.
    const placedY: number[] = [];
    const labelledDrones = new Set<string>();
    for (let i = 0; i < chart.data.datasets.length; i++) {
      const ds = chart.data.datasets[i] as EndLabelDataset;
      if (ds._sev !== 'outlier' && ds._sev !== 'selected') continue;
      if (ds._isPrimary === false) continue;
      const droneId = ds.label ?? '';
      if (labelledDrones.has(droneId)) continue;
      const meta = chart.getDatasetMeta(i);
      const last = meta.data[meta.data.length - 1];
      if (!last) continue;
      let y = last.y;
      while (placedY.some((py) => Math.abs(py - y) < 14)) y += 14;
      placedY.push(y);
      labelledDrones.add(droneId);
      const x = Math.min(last.x + 4, area.right - 2);
      ctx.fillStyle = ds.borderColor as string;
      ctx.fillText(droneId, x, y);
    }
    ctx.restore();
  },
};

type MetricConfig = {
  /** Stable identifier used as React key. */
  id: string;
  /** Series in this chart. Multiple → one dataset per (drone, series); secondaries are dashed. */
  seriesKeys: UAVLiveMetric[];
  titleKey: string;
  unitLabel?: (v: number) => string;
  yMin?: number;
  yMax?: number;
  tickCallback?: (v: number | string) => string;
  /** Outlier if `(median - latest) >= divergenceThreshold` AND in bottom-K. */
  divergenceThreshold?: number;
  /** Outlier whenever the predicate matches (e.g. GPS fix < RTK_FIXED). */
  absoluteOutlier?: (v: number) => boolean;
};

const METRIC_CONFIGS: MetricConfig[] = [
  {
    id: 'rssi',
    seriesKeys: ['rssi', 'rssiSecondary'],
    titleKey: 'rssi',
    unitLabel: (v) => `${v}`,
    yMin: 0,
    yMax: 100,
    divergenceThreshold: 15,
  },
  {
    id: 'voltage',
    seriesKeys: ['voltage'],
    titleKey: 'voltage',
    unitLabel: (v) => `${v.toFixed(2)} V`,
    divergenceThreshold: 0.3,
  },
  {
    id: 'gpsFixType',
    seriesKeys: ['gpsFixType'],
    titleKey: 'gpsFix',
    unitLabel: (v) =>
      abbreviateGPSFixType((v as GPSFixType) ?? GPSFixType.UNKNOWN),
    yMin: GPS_FIX_TYPE_ORDER[0],
    yMax: GPS_FIX_TYPE_ORDER[GPS_FIX_TYPE_ORDER.length - 1],
    tickCallback: (v) => {
      const n = typeof v === 'number' ? v : Number(v);
      if (!Number.isInteger(n)) return '';
      return abbreviateGPSFixType(n as GPSFixType);
    },
    absoluteOutlier: (v) => v < GPSFixType.RTK_FIXED,
  },
];

const UAVLivePanel = () => {
  const { t } = useTranslation(undefined, {
    keyPrefix: 'uavLivePanel',
  });
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const update = useUpdate();

  const byUavId = useSelector(getUAVLiveByUavId);
  const uavIds = useSelector(getKnownUAVLiveIds);
  const selectedUavIds = useSelector(getSelectedUAVIds);
  const windowMs = useSelector(getUAVLiveWindowMs) || WINDOW_MS;

  useHarmonicIntervalFn(update, 1000);

  const selectedSet = useMemo(() => new Set(selectedUavIds), [selectedUavIds]);

  const now = Date.now();
  const xMin = now - windowMs;
  const isDark = isThemeDark(theme);

  const axisColor = isDark
    ? 'rgba(255, 255, 255, 0.54)'
    : 'rgba(0, 0, 0, 0.54)';
  const gridColor = isDark
    ? 'rgba(255, 255, 255, 0.12)'
    : 'rgba(0, 0, 0, 0.12)';

  const buildOptions = (cfg: MetricConfig): ChartOptions<'line'> => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    parsing: false,
    normalized: true,
    interaction: { mode: 'nearest', intersect: false, axis: 'xy' },
    onClick(_evt, elements, chart: Chart) {
      const first = elements[0];
      if (!first) return;
      const ds = chart.data.datasets[first.datasetIndex];
      const uavId = ds?.label;
      if (uavId) dispatch(setSelectedUAVIds([uavId]));
    },
    plugins: {
      legend: { display: false },
      decimation: { enabled: true, algorithm: 'min-max' },
      tooltip: {
        titleFont: { family: defaultFont },
        bodyFont: { family: defaultFont },
        filter: (item) => {
          const ds = item.dataset as EndLabelDataset;
          return ds._sev !== 'normal';
        },
        callbacks: {
          title: (items: TooltipItem<'line'>[]) => {
            const x = items[0]?.parsed?.x;
            if (typeof x !== 'number') return '';
            return formatRelativeSeconds(x - Date.now());
          },
          label: (item: TooltipItem<'line'>) => {
            const v = item.parsed.y;
            const label = item.dataset.label ?? '';
            const formatted = cfg.unitLabel ? cfg.unitLabel(v) : String(v);
            return ` ${label}: ${formatted}`;
          },
        },
      },
    },
    scales: {
      x: {
        type: 'linear',
        min: xMin,
        max: now,
        grid: { color: gridColor },
        ticks: {
          font: { family: defaultFont, size: 11 },
          color: axisColor,
          maxTicksLimit: 6,
          callback(value) {
            const v = typeof value === 'number' ? value : Number(value);
            return formatRelativeSeconds(v - Date.now());
          },
        },
      },
      y: {
        suggestedMin: cfg.yMin,
        suggestedMax: cfg.yMax,
        grid: { color: gridColor },
        ticks: {
          font: { family: defaultFont, size: 11 },
          color: axisColor,
          maxTicksLimit: 6,
          callback: cfg.tickCallback
            ? function callback(value) {
                return cfg.tickCallback!(value);
              }
            : undefined,
        },
      },
    },
  });

  const hasAnyData = uavIds.some((id) => {
    const s = byUavId[id];
    return (
      s &&
      (s.rssi.length > 0 || s.voltage.length > 0 || s.gpsFixType.length > 0)
    );
  });

  // Per-metric datasets are recomputed only when Redux-owned inputs change —
  // not on every 1s `useUpdate` tick used to slide the x-axis.
  const datasetsByMetric = useMemo(
    () =>
      METRIC_CONFIGS.map((cfg) => {
        const severity = computeSeverity(cfg, uavIds, byUavId, selectedSet);
        const datasets = buildDatasets(cfg, byUavId, uavIds, severity);
        return { cfg, datasets };
      }),
    [uavIds, byUavId, selectedSet]
  );

  if (!hasAnyData) {
    return <BackgroundHint text={t('noData')} />;
  }

  return (
    <Stack
      direction='column'
      spacing={1}
      sx={{ height: '100%', p: 1, overflow: 'hidden' }}
    >
      {datasetsByMetric.map(({ cfg, datasets }) => {
        return (
          <Box
            key={cfg.id}
            sx={{
              flex: 1,
              minHeight: 120,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Typography
              variant='caption'
              sx={{ color: axisColor, fontFamily: defaultFont, pl: 1 }}
            >
              {t(cfg.titleKey)}
            </Typography>
            <Box sx={{ flex: 1, minHeight: 0 }}>
              <LineChart
                data={{ datasets } as ChartData<'line', SeriesPoint[]>}
                options={buildOptions(cfg)}
                plugins={[endLabelPlugin]}
              />
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
};

export default UAVLivePanel;
