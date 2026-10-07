import { corridorDistance, evaluateObservation } from './monitoring-domain.js';
import type { MonitorParameters, MonitorState } from './monitoring-domain.js';
const line: [number, number][] = [
  [-99.2, 19.4],
  [-99.1, 19.4],
];
const params: MonitorParameters = {
  corridorMeters: 200,
  confirmSeconds: 60,
  confirmObservations: 3,
  stopRadiusMeters: 30,
  stopSeconds: 300,
  maxGapSeconds: 120,
  maxAccuracyMeters: 100,
  authorizedStops: [],
};
const point = (second: number, latitude = 19.4, id = String(second)) => ({
  id,
  observedAt: new Date(Date.UTC(2026, 9, 7, 12, 0, second)).toISOString(),
  latitude,
  longitude: -99.15,
});
describe('Route monitoring rules', () => {
  it('measures the nearest road segment, including endpoints', () => {
    expect(corridorDistance(point(0), line)).toBeLessThan(1);
    expect(corridorDistance(point(0, 19.42), line)).toBeGreaterThan(2000);
    expect(
      corridorDistance({ ...point(0), longitude: -99.3 }, line),
    ).toBeGreaterThan(10000);
  });
  it('requires sustained valid deviation, resolves after two inner observations', () => {
    let state: MonitorState = {};
    let result = evaluateObservation(state, point(0, 19.42), line, params);
    expect(result.openDeviation).toBe(false);
    state = result.state;
    result = evaluateObservation(state, point(30, 19.42), line, params);
    expect(result.openDeviation).toBe(false);
    result = evaluateObservation(result.state, point(60, 19.42), line, params);
    expect(result.openDeviation).toBe(true);
    result = evaluateObservation(result.state, point(70), line, params);
    expect(result.resolveDeviation).toBe(false);
    expect(
      evaluateObservation(result.state, point(80), line, params)
        .resolveDeviation,
    ).toBe(true);
  });
  it('uses hysteresis near the corridor boundary', () => {
    const state: MonitorState = {
      outsideSince: point(0).observedAt,
      outsideId: '0',
      outsideCount: 3,
    };
    const result = evaluateObservation(state, point(80, 19.4015), line, params);
    expect(result.resolveDeviation).toBe(false);
    expect(result.openDeviation).toBe(false);
    expect(result.state.outsideId).toBe('0');
  });
  it('does not treat missing signal as a stop', () => {
    const state = evaluateObservation({}, point(0), line, params).state;
    const result = evaluateObservation(state, point(400), line, params);
    expect(result.openStop).toBe(false);
    expect(result.state.anchorAt).toBe(point(400).observedAt);
  });
  it('confirms a stop only with contiguous observations', () => {
    let state: MonitorState = {};
    for (const second of [0, 60, 120, 180, 240])
      state = evaluateObservation(state, point(second), line, params).state;
    expect(evaluateObservation(state, point(300), line, params).openStop).toBe(
      true,
    );
    expect(
      evaluateObservation(
        state,
        { ...point(300), longitude: -99.14 },
        line,
        params,
      ).resolveStop,
    ).toBe(true);
  });
  it('excludes authorized stop zones', () => {
    const p = {
      ...params,
      authorizedStops: [
        { latitude: 19.4, longitude: -99.15, radiusMeters: 100 },
      ],
    };
    const result = evaluateObservation(
      { anchor: point(0), anchorAt: point(0).observedAt },
      point(300),
      line,
      p,
    );
    expect(result.openStop).toBe(false);
    expect(result.resolveStop).toBe(true);
  });
  it('ignores repeated, late and poor-quality observations without changing state', () => {
    const state = evaluateObservation({}, point(60), line, params).state;
    for (const input of [point(60), point(30)])
      expect(evaluateObservation(state, input, line, params)).toMatchObject({
        state,
        ignored: 'late-or-same-time',
      });
    expect(
      evaluateObservation(
        state,
        { ...point(90), accuracyMeters: 500 },
        line,
        params,
      ),
    ).toMatchObject({ state, ignored: 'quality' });
  });
  it('starts confirmation again after a telemetry gap or new route state', () => {
    const result = evaluateObservation(
      {
        lastAt: point(0).observedAt,
        outsideSince: point(0).observedAt,
        outsideCount: 20,
        outsideId: '0',
      },
      point(400, 19.42),
      line,
      params,
    );
    expect(result.openDeviation).toBe(false);
    expect(result.state.outsideCount).toBe(1);
    expect(
      evaluateObservation({}, point(400, 19.42), line, params).openDeviation,
    ).toBe(false);
  });
});
