import { useQueryClient } from '@tanstack/react-query';
export function useOperationsRefresh() {
  const client = useQueryClient();
  return () =>
    client.invalidateQueries({
      predicate: (query) =>
        [
          'shipments',
          'shipment',
          'fleet',
          'positions',
          'inventory',
          'alerts',
          'movements',
          'warehouses',
          'dashboard',
        ].includes(String(query.queryKey[0])),
    });
}
