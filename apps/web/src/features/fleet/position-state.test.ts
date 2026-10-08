import { expect, it } from 'vitest';
import { mergeFleetPages, positionAge } from './position-state';
import type { FleetPage, Position } from '@logistics-globe/shared';
const point = (id: string, observedAt: string): Position => ({
  id,
  observedAt,
  receivedAt: observedAt,
  vehicleId: 'v',
  latitude: 19,
  longitude: -99,
});
const page = (p: Position | null): FleetPage => ({
  page: 1,
  pageSize: 100,
  total: 1,
  items: [
    {
      id: 'v',
      plate: 'DEMO',
      status: 'AVAILABLE',
      position: p,
      createdAt: '',
      updatedAt: '',
    },
  ],
});
it('preserves the newer WebSocket position when an older HTTP response arrives, while applying fresh catalog state', () => {
  const old = page(point('b', '2026-10-07T12:02:00Z')),
    incoming = page(point('a', '2026-10-07T12:01:00Z'));
  incoming.items[0].status = 'ON_ROUTE';
  const result = mergeFleetPages(old, incoming) as FleetPage;
  expect(result.items[0].position?.id).toBe('b');
  expect(result.items[0].status).toBe('ON_ROUTE');
  expect(
    (
      mergeFleetPages(
        old,
        page(point('c', '2026-10-07T12:02:00Z')),
      ) as FleetPage
    ).items[0].position?.id,
  ).toBe('c');
  expect(result.items).toHaveLength(1);
  expect(
    (mergeFleetPages(old, page(null)) as FleetPage).items[0].position,
  ).toEqual(old.items[0].position);
});
it('uses the same five-minute boundary and distinguishes absent and stale telemetry without re-fetching', () => {
  const p = point('a', '2026-10-07T12:00:00Z');
  expect(positionAge(null, Date.parse(p.observedAt))).toBe('Sin telemetría');
  expect(positionAge(p, Date.parse(p.observedAt) + 300000)).toContain(
    'Reciente',
  );
  expect(positionAge(p, Date.parse(p.observedAt) + 301000)).toContain(
    'Desactualizada',
  );
});
