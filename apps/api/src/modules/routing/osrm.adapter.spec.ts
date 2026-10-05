import { OsrmAdapter } from './osrm.adapter.js';
const input = {
  origin: { latitude: 19, longitude: -99 },
  destination: { latitude: 20, longitude: -98 },
};
afterEach(() => vi.unstubAllGlobals());
describe('OSRM provider boundary', () => {
  it('uses longitude/latitude order and validates a road geometry', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 'Ok',
          routes: [
            {
              distance: 1234,
              duration: 600,
              geometry: {
                type: 'LineString',
                coordinates: [
                  [-99, 19],
                  [-98, 20],
                ],
              },
            },
          ],
        }),
      ),
    );
    vi.stubGlobal('fetch', fetcher);
    const result = await new OsrmAdapter('https://routing.example').route(
      input,
    );
    expect(String(fetcher.mock.calls[0][0])).toContain(
      '/driving/-99,19;-98,20',
    );
    expect(result.distanceMeters).toBe(1234);
    expect(result.coordinates).toEqual([
      [-99, 19],
      [-98, 20],
    ]);
  });
  it('does not manufacture a route when no provider is configured', async () => {
    await expect(new OsrmAdapter('').route(input)).rejects.toThrow(
      'not configured',
    );
  });
  it('rejects corrupt geometry and safe-fails a provider outage', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 'Ok',
            routes: [
              {
                distance: 1,
                duration: 1,
                geometry: {
                  type: 'LineString',
                  coordinates: [
                    [999, 19],
                    [-98, 20],
                  ],
                },
              },
            ],
          }),
        ),
      ),
    );
    await expect(
      new OsrmAdapter('https://routing.example').route(input),
    ).rejects.toThrow('geometry');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('private connection details')),
    );
    await expect(
      new OsrmAdapter('https://routing.example').route(input),
    ).rejects.toThrow('Routing provider unavailable');
  });
});

it('reports NoRoute as a validation result even when OSRM returns HTTP 400', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ code: 'NoRoute' }), { status: 400 }),
      ),
  );
  await expect(
    new OsrmAdapter('https://routing.example').route(input),
  ).rejects.toThrow('No drivable route');
});
