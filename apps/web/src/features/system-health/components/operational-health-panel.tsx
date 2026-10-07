import { useQuery } from '@tanstack/react-query';
import { operationalHealth } from '../api/system-health';
import { LoadingState, ErrorState } from '../../../components/ui/query-state';
const labels = {
  operational: 'Operativo',
  degraded: 'Degradado',
  unavailable: 'No disponible',
  'not-configured': 'No configurado',
  unknown: 'Desconocido',
};
export function OperationalHealthPanel() {
  const query = useQuery({
    queryKey: ['operational-health'],
    queryFn: operationalHealth,
    refetchInterval: 30000,
  });
  if (query.isPending)
    return <LoadingState message="Consultando salud funcional…" />;
  if (query.isError)
    return (
      <ErrorState
        message={query.error.message}
        retry={() => {
          void query.refetch();
        }}
      />
    );
  return (
    <section className="panel operation-form">
      <h2>Salud funcional</h2>
      <p>
        Inventario es un módulo de la API. Las sondas son de lectura y no
        generan rutas facturables. Caché de 15 segundos.
      </p>
      <p>Comprobado: {query.data.checkedAt}</p>
      <div className="table-scroll">
        <table>
          <caption>Estado y alcance de las comprobaciones</caption>
          <thead>
            <tr>
              <th>Componente</th>
              <th>Estado</th>
              <th>Latencia (ms)</th>
              <th>Evidencia</th>
              <th>Fecha UTC</th>
            </tr>
          </thead>
          <tbody>
            {query.data.components.map((c) => (
              <tr key={c.name}>
                <td>{c.name}</td>
                <td>{labels[c.status]}</td>
                <td>{c.latencyMs ?? 'N/D'}</td>
                <td>{c.reason}</td>
                <td>{c.checkedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
