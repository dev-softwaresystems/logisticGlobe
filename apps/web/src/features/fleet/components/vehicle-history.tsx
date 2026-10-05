import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { sendPosition, vehiclePositions } from '../api/fleet';
import { useOperationsRefresh } from '../../../hooks/use-operations';
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
  const [page, setPage] = useState(1);
  const refresh = useOperationsRefresh();
  const history = useQuery({
    queryKey: ['positions', id, page],
    queryFn: () => vehiclePositions(id, page),
  });
  const position = useMutation({
    mutationFn: sendPosition,
    onSuccess: () => refresh(),
  });
  return (
    <section className="panel operation-form">
      <h2>Historial GPS</h2>
      <p className="muted">Vehículo {plate}</p>
      {canWrite && (
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            position.mutate({
              vehicleId: id,
              id: crypto.randomUUID(),
              latitude: Number(form.get('latitude')),
              longitude: Number(form.get('longitude')),
              observedAt: new Date().toISOString(),
            });
          }}
        >
          <label>
            Latitud
            <input
              name="latitude"
              type="number"
              min={-90}
              max={90}
              step="any"
              required
            />
          </label>
          <label>
            Longitud
            <input
              name="longitude"
              type="number"
              min={-180}
              max={180}
              step="any"
              required
            />
          </label>
          <button className="secondary-button" disabled={position.isPending}>
            Registrar observación
          </button>
        </form>
      )}
      {position.isError && <p role="alert">{position.error.message}</p>}
      {position.isSuccess && <p role="status">Observación registrada.</p>}
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
                {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)} ·{' '}
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
