import { lazy, Suspense } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { integrationStatus, calculateRoute } from '../api/routing';
const RouteMap = lazy(() => import('../components/route-map'));
export function RoutingPage() {
  const status = useQuery({
    queryKey: ['integrations'],
    queryFn: integrationStatus,
  });
  const route = useMutation({ mutationFn: calculateRoute });
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">PLANIFICACIÓN DE TRANSPORTE</p>
          <h1>Rutas</h1>
          <p>
            Trayecto, distancia y tiempo estimado por el proveedor autorizado.
          </p>
        </div>
      </div>
      {status.isPending && (
        <p role="status">Comprobando disponibilidad del servicio…</p>
      )}
      {status.isError && (
        <p role="alert">No se pudo comprobar el proveedor de rutas.</p>
      )}
      {status.data && !status.data.routingConfigured && (
        <section className="panel route-panel">
          <h2>Servicio de rutas pendiente de conexión</h2>
          <p>
            Configura un proveedor aprobado para calcular recorridos. El
            seguimiento de envíos y flota sigue disponible.
          </p>
        </section>
      )}
      {status.data?.routingConfigured && (
        <form
          className="operation-form panel"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            route.mutate({
              origin: {
                latitude: Number(data.get('originLat')),
                longitude: Number(data.get('originLon')),
              },
              destination: {
                latitude: Number(data.get('destinationLat')),
                longitude: Number(data.get('destinationLon')),
              },
            });
          }}
        >
          <h2>Calcular trayecto</h2>
          <label>
            Latitud de origen
            <input
              name="originLat"
              type="number"
              min={-90}
              max={90}
              step="any"
              required
            />
          </label>
          <label>
            Longitud de origen
            <input
              name="originLon"
              type="number"
              min={-180}
              max={180}
              step="any"
              required
            />
          </label>
          <label>
            Latitud de destino
            <input
              name="destinationLat"
              type="number"
              min={-90}
              max={90}
              step="any"
              required
            />
          </label>
          <label>
            Longitud de destino
            <input
              name="destinationLon"
              type="number"
              min={-180}
              max={180}
              step="any"
              required
            />
          </label>
          <button className="primary-button" disabled={route.isPending}>
            {route.isPending ? 'Calculando…' : 'Calcular ruta'}
          </button>
        </form>
      )}
      {route.isError && <p role="alert">{route.error.message}</p>}
      {route.data && (
        <section className="panel route-panel">
          <h2>Trayecto calculado</h2>
          <p>
            {(route.data.distanceMeters / 1000).toFixed(1)} km ·{' '}
            {(route.data.durationSeconds / 60).toFixed(0)} minutos estimados ·{' '}
            {route.data.cached ? 'Resultado reciente' : 'Calculado ahora'}
          </p>
          <Suspense fallback={<p>Cargando mapa…</p>}>
            <RouteMap key={route.data.calculatedAt} route={route.data} />
          </Suspense>
        </section>
      )}
    </>
  );
}
