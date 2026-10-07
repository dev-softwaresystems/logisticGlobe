import { dailyCuts, dailyComparison } from './daily-comparison.js';
describe('Daily snapshots', () => {
  it('uses operational days independently of host time', () => {
    const cuts = dailyCuts(
      new Date('2026-10-07T05:59:59Z'),
      'America/Mexico_City',
    );
    expect(cuts.current.toISOString()).toBe('2026-10-07T05:59:00.000Z');
    expect(cuts.previous?.toISOString()).toBe('2026-10-06T05:59:00.000Z');
  });
  it('handles DST days and refuses ambiguous homologous times', () => {
    expect(
      dailyCuts(
        new Date('2026-03-09T05:00:00Z'),
        'America/New_York',
      ).previous?.toISOString(),
    ).toBe('2026-03-08T06:00:00.000Z');
    expect(
      dailyCuts(new Date('2026-03-09T06:30:00Z'), 'America/New_York').previous,
    ).toBeNull();
  });
  it('does not invent history or percent from zero', () => {
    const at = new Date('2026-10-07T12:00:00Z'),
      cuts = dailyCuts(at, 'America/Mexico_City');
    expect(
      dailyComparison({ active: 5, observedAt: at }, null, cuts),
    ).toMatchObject({
      previous: null,
      percent: null,
      reason: 'missing-history',
    });
    expect(
      dailyComparison(
        { active: 5, observedAt: at },
        { active: 0, observedAt: at },
        cuts,
      ),
    ).toMatchObject({ difference: 5, percent: null, reason: 'zero-base' });
    expect(
      dailyComparison(
        { active: 3, observedAt: at },
        { active: 6, observedAt: at },
        cuts,
      ),
    ).toMatchObject({ difference: -3, percent: -50 });
  });
});
