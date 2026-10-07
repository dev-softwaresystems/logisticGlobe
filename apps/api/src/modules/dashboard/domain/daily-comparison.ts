import { Temporal } from '@js-temporal/polyfill';
export function dailyCuts(now: Date, timeZone: string) {
  const current = Temporal.Instant.from(now.toISOString())
    .toZonedDateTimeISO(timeZone)
    .with({ second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 });
  const previousWall = current.toPlainDateTime().subtract({ days: 1 });
  let previous: string | null = null;
  try {
    previous = previousWall
      .toZonedDateTime(timeZone, { disambiguation: 'reject' })
      .toInstant()
      .toString();
  } catch {
    /* Ambiguous/missing wall time has no comparable cut. */
  }
  return {
    current: new Date(current.toInstant().toString()),
    previous: previous ? new Date(previous) : null,
    timeZone,
  };
}
export function dailyComparison(
  current: { active: number; observedAt: Date },
  previous: { active: number; observedAt: Date } | null,
  cuts: ReturnType<typeof dailyCuts>,
) {
  const difference = previous ? current.active - previous.active : null;
  return {
    metric: 'activeShipments' as const,
    basis: 'observed-minute-snapshot' as const,
    timeZone: cuts.timeZone,
    currentCut: cuts.current.toISOString(),
    previousCut: cuts.previous?.toISOString() ?? null,
    current: current.active,
    previous: previous?.active ?? null,
    difference,
    percent:
      previous && previous.active !== 0
        ? Number(((difference! / previous.active) * 100).toFixed(2))
        : null,
    currentObservedAt: current.observedAt.toISOString(),
    previousObservedAt: previous?.observedAt.toISOString() ?? null,
    reason: !cuts.previous
      ? 'ambiguous-local-time'
      : !previous
        ? 'missing-history'
        : previous.active === 0
          ? 'zero-base'
          : null,
  };
}
