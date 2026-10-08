import type { FleetPage, Position } from '@logistics-globe/shared';
export function positionIsNewer(a: Position, b: Position) {
  return (
    a.observedAt > b.observedAt ||
    (a.observedAt === b.observedAt && a.id > b.id)
  );
}
export function mergeFleetPages(oldData: unknown, newData: unknown): unknown {
  const oldPage = oldData as FleetPage | undefined,
    next = newData as FleetPage;
  if (!oldPage?.items || !next?.items) return newData;
  return {
    ...next,
    items: next.items.map((vehicle) => {
      const previous = oldPage.items.find((v) => v.id === vehicle.id)?.position;
      return previous &&
        (!vehicle.position || positionIsNewer(previous, vehicle.position))
        ? { ...vehicle, position: previous }
        : vehicle;
    }),
  };
}
export function positionAge(position: Position | null, now: number) {
  if (!position) return 'Sin telemetría';
  const seconds = Math.max(
    0,
    Math.floor((now - Date.parse(position.observedAt)) / 1000),
  );
  return (
    (seconds > 300 ? 'Desactualizada' : 'Reciente') +
    ' · hace ' +
    (seconds < 60 ? seconds + ' s' : Math.floor(seconds / 60) + ' min')
  );
}
