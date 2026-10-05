import { act, cleanup, render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, it, expect, vi } from 'vitest';
import type { LogisticsEvent, Page, Vehicle } from '@logistics-globe/shared';
import { useRealtime } from './use-realtime';
import { connectRealtime } from '../services/realtime';
vi.mock('../services/realtime');
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it('updates cached positions from typed events without regressing for delayed observations and closes on unmount', () => {
  let receive: ((event: LogisticsEvent) => void) | undefined;
  const close = vi.fn();
  vi.mocked(connectRealtime).mockImplementation((listener) => {
    receive = listener;
    return close;
  });
  const client = new QueryClient();
  client.setQueryData<Page<Vehicle>>(['fleet', 'map'], {
    items: [
      {
        id: 'vehicle',
        plate: 'GPS',
        status: 'ON_ROUTE',
        position: null,
        createdAt: '',
        updatedAt: '',
      },
    ],
    total: 1,
    page: 1,
    pageSize: 100,
  });
  function Harness() {
    useRealtime();
    return null;
  }
  const view = render(
    <QueryClientProvider client={client}>
      <Harness />
    </QueryClientProvider>,
  );
  const update = (observedAt: string, latitude: number) => ({
    id: observedAt,
    name: 'fleet.position.updated' as const,
    occurredAt: observedAt,
    payload: { vehicleId: 'vehicle', latitude, longitude: -99, observedAt },
  });
  act(() => receive!(update('2026-10-04T12:00:00.000Z', 19)));
  act(() => receive!(update('2026-10-04T11:00:00.000Z', 18)));
  expect(
    client.getQueryData<Page<Vehicle>>(['fleet', 'map'])?.items[0].position
      ?.latitude,
  ).toBe(19);
  view.unmount();
  expect(close).toHaveBeenCalledOnce();
  client.clear();
});
