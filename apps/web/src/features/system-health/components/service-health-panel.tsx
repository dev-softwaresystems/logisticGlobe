import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getServicesHealth } from '../api/system-health';
import { ErrorState, LoadingState } from '../../../components/ui/query-state';
const names = {
  api: 'API LogisticsGlobe',
  postgresql: 'PostgreSQL',
  mongodb: 'MongoDB',
  redis: 'Redis',
};
export function ServiceHealthPanel() {
  const health = useQuery({
    queryKey: ['health', 'services'],
    queryFn: getServicesHealth,
    refetchInterval: 30000,
  });
  return (
    <section className="panel health-panel" aria-labelledby="health-title">
      <div className="panel-heading">
        <h2 id="health-title">Estado de servicios</h2>
        <Link to="/system">Ver estado</Link>
      </div>
      {health.isPending ? (
        <LoadingState />
      ) : health.isError ? (
        <ErrorState
          message={health.error.message}
          retry={() => {
            void health.refetch();
          }}
        />
      ) : (
        <>
          <p className={'health-summary ' + health.data.status} role="status">
            <span className="status-dot" />
            {health.data.status === 'up'
              ? 'Todos los servicios operativos'
              : 'Hay servicios sin conexión'}
          </p>
          <ul className="service-list">
            {health.data.services.map((service) => (
              <li key={service.name}>
                <span>{names[service.name]}</span>
                <span className={'service-status ' + service.status}>
                  <span className="status-dot" />
                  {service.status === 'up' ? 'Operativo' : 'Sin conexión'}
                  <small>
                    {service.latencyMs === null
                      ? '—'
                      : service.latencyMs + ' ms'}
                  </small>
                </span>
              </li>
            ))}
          </ul>
          <p className="panel-note">
            Última comprobación:{' '}
            {new Date(health.data.checkedAt).toLocaleTimeString('es-MX')}
          </p>
        </>
      )}
    </section>
  );
}
