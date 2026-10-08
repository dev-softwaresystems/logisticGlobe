import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getVehicle, vehiclePositions } from '../api/fleet';
import { ManualPosition } from './manual-position';
import { Pagination } from '../../../components/ui/pagination';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../components/ui/query-state';
export function VehicleHistory({
  id,
  plate,
  canWrite,
}: {
  id: string;
  plate: string;
  canWrite: boolean;
}) {
  const detail = useQuery({
    queryKey: ['fleet', 'detail', id],
    queryFn: () => getVehicle(id),
  });
  const [page, setPage] = useState(1);
  const history = useQuery({
    queryKey: ['positions', id, page],
    queryFn: () => vehiclePositions(id, page),
  });
  return (
    <section className="panel operation-form">
      <h2>Historial GPS</h2>
      <p className="muted">Vehículo {detail.data?.plate ?? plate}</p>
      {canWrite && <ManualPosition vehicleId={id} />}
      {history.isPending ? (
        <LoadingState message="Consultando historial…" />
      ) : history.isError ? (
        <ErrorState
          message={history.error.message}
          retry={() => {
            void history.refetch();
          }}
        />
      ) : history.data.items.length ? (
        <>
          <ol className="timeline">
            {history.data.items.map((p) => (
              <li key={p.id}>
                {p.source === 'simulated'
                  ? 'DEMO · Simulada'
                  : p.source === 'manual'
                    ? 'Manual'
                    : p.source === 'device'
                      ? 'Integración GPS'
                      : 'Origen N/D'}{' '}
                · {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)} ·{' '}
                <time dateTime={p.observedAt}>
                  {new Date(p.observedAt).toLocaleString('es-MX')}
                </time>
              </li>
            ))}
          </ol>
          <Pagination {...history.data} onPage={setPage} />
        </>
      ) : (
        <EmptyState
          title="Sin observaciones GPS"
          description="El historial se conservará en MongoDB cuando se reciban posiciones."
        />
      )}
    </section>
  );
}
