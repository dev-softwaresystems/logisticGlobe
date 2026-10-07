import type { Coordinate } from '@logistics-globe/shared';
export interface MonitorParameters {
  corridorMeters: number;
  confirmSeconds: number;
  confirmObservations: number;
  stopRadiusMeters: number;
  stopSeconds: number;
  maxGapSeconds: number;
  maxAccuracyMeters: number;
  authorizedStops: {
    latitude: number;
    longitude: number;
    radiusMeters: number;
  }[];
}
export interface MonitorState {
  lastAt?: string;
  lastId?: string;
  outsideSince?: string;
  outsideId?: string;
  outsideCount?: number;
  insideCount?: number;
  anchor?: Coordinate;
  anchorAt?: string;
  anchorId?: string;
}
export function distance(a: Coordinate, b: Coordinate) {
  const rad = Math.PI / 180,
    lat = (b.latitude - a.latitude) * rad,
    lon = (b.longitude - a.longitude) * rad;
  const x =
    Math.sin(lat / 2) ** 2 +
    Math.cos(a.latitude * rad) *
      Math.cos(b.latitude * rad) *
      Math.sin(lon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(Math.max(0, 1 - x)));
}
export function corridorDistance(point: Coordinate, line: [number, number][]) {
  const scale = (6371000 * Math.PI) / 180,
    cos = Math.cos((point.latitude * Math.PI) / 180);
  const local = ([lon, lat]: [number, number]) => {
    const delta = ((lon - point.longitude + 540) % 360) - 180;
    return [delta * scale * cos, (lat - point.latitude) * scale];
  };
  let best = Infinity;
  for (let i = 1; i < line.length; i++) {
    const a = local(line[i - 1]),
      b = local(line[i]),
      dx = b[0] - a[0],
      dy = b[1] - a[1],
      den = dx * dx + dy * dy,
      t = den ? Math.max(0, Math.min(1, -(a[0] * dx + a[1] * dy) / den)) : 0;
    best = Math.min(best, Math.hypot(a[0] + t * dx, a[1] + t * dy));
  }
  return best;
}
export function evaluateObservation(
  prior: MonitorState,
  point: Coordinate & {
    id: string;
    observedAt: string;
    accuracyMeters?: number;
  },
  line: [number, number][],
  params: MonitorParameters,
) {
  const at = new Date(point.observedAt).getTime();
  const base = {
    state: prior,
    ignored: null as string | null,
    openDeviation: false,
    resolveDeviation: false,
    openStop: false,
    resolveStop: false,
    distanceMeters: null as number | null,
  };
  if (
    point.accuracyMeters !== undefined &&
    point.accuracyMeters > params.maxAccuracyMeters
  )
    return { ...base, ignored: 'quality' };
  if (prior.lastAt && at <= new Date(prior.lastAt).getTime())
    return { ...base, ignored: 'late-or-same-time' };
  const gap =
    prior.lastAt &&
    at - new Date(prior.lastAt).getTime() > params.maxGapSeconds * 1000;
  const state: MonitorState = gap ? {} : { ...prior };
  state.lastAt = point.observedAt;
  state.lastId = point.id;
  const meters = corridorDistance(point, line);
  const outside = meters > params.corridorMeters;
  let openDeviation = false,
    resolveDeviation = false;
  if (outside) {
    state.insideCount = 0;
    state.outsideSince ??= point.observedAt;
    state.outsideId ??= point.id;
    state.outsideCount = (state.outsideCount ?? 0) + 1;
    openDeviation =
      state.outsideCount >= params.confirmObservations &&
      at - new Date(state.outsideSince!).getTime() >=
        params.confirmSeconds * 1000;
  } else if (meters < params.corridorMeters * 0.7) {
    state.outsideSince = undefined;
    state.outsideId = undefined;
    state.outsideCount = 0;
    state.insideCount = (state.insideCount ?? 0) + 1;
    resolveDeviation = state.insideCount >= 2;
  }
  const authorized = params.authorizedStops.some(
    (zone) => distance(point, zone) <= zone.radiusMeters,
  );
  let openStop = false,
    resolveStop = false;
  if (authorized) {
    state.anchor = undefined;
    state.anchorAt = undefined;
    state.anchorId = undefined;
    resolveStop = true;
  } else if (
    !state.anchor ||
    distance(state.anchor, point) > params.stopRadiusMeters
  ) {
    state.anchor = { latitude: point.latitude, longitude: point.longitude };
    state.anchorAt = point.observedAt;
    state.anchorId = point.id;
    resolveStop = true;
  } else
    openStop =
      at - new Date(state.anchorAt!).getTime() >= params.stopSeconds * 1000;
  return {
    state,
    ignored: null,
    openDeviation,
    resolveDeviation,
    openStop,
    resolveStop,
    distanceMeters: Math.round(meters),
  };
}
