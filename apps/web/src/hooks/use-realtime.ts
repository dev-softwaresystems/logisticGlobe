import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectRealtime } from '../services/realtime';
import type { LogisticsEvent, Page, Vehicle } from '@logistics-globe/shared';
const keys: Record<LogisticsEvent['name'], string[]> = {
  'route.plan.updated': ['route-plans', 'route-incidents'],
  'route.incident.updated': ['route-incidents'],
  'fleet.position.updated': [
    'fleet',
    'positions',
    'route-plans',
    'route-incidents',
  ],
  'fleet.vehicle.updated': ['fleet', 'dashboard'],
  'shipment.status.updated': ['shipments', 'shipment', 'dashboard', 'fleet'],
  'inventory.threshold.breached': [
    'inventory',
    'alerts',
    'dashboard',
    'movements',
  ],
  'inventory.updated': ['inventory', 'alerts', 'dashboard', 'movements'],
  'inventory.warehouse.updated': ['warehouses', 'dashboard'],
  'system.health.updated': ['health'],
};
export function useRealtime() {
  const client = useQueryClient();
  const [state, setState] = useState<'connected' | 'reconnecting'>(
    'reconnecting',
  );
  useEffect(() => {
    const dirty = new Set<string>();
    const flush = setInterval(() => {
      if (!dirty.size) return;
      const batch = [...dirty];
      dirty.clear();
      void client.invalidateQueries({
        predicate: (query) => batch.includes(String(query.queryKey[0])),
      });
    }, 1000);
    const close = connectRealtime(
      (event) => {
        if (event.name === 'fleet.position.updated') {
          const payload = event.payload;
          client.setQueriesData<Page<Vehicle>>(
            { queryKey: ['fleet'] },
            (previous) =>
              previous && Array.isArray(previous.items)
                ? {
                    ...previous,
                    items: previous.items.map((vehicle) => {
                      if (
                        vehicle.id !== payload.vehicleId ||
                        (vehicle.position &&
                          (vehicle.position.observedAt > payload.observedAt ||
                            (vehicle.position.observedAt ===
                              payload.observedAt &&
                              vehicle.position.id >= event.id)))
                      )
                        return vehicle;
                      return {
                        ...vehicle,
                        position: {
                          ...payload,
                          id: event.id,
                          receivedAt: event.occurredAt,
                        },
                      };
                    }),
                  }
                : previous,
          );
        }
        keys[event.name]?.forEach((key) => dirty.add(key));
      },
      (next) => {
        setState(next);
        if (next === 'connected')
          void client.invalidateQueries({
            predicate: (query) => query.queryKey[0] !== 'session',
          });
      },
    );
    return () => {
      clearInterval(flush);
      close();
    };
  }, [client]);
  return state;
}
