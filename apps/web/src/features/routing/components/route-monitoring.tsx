import { lazy, Suspense, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  routePlans,
  routeIncidents,
  acknowledgeIncident,
} from '../api/monitoring';
import { listVehicles } from '../../fleet/api/fleet';
import { usePermission } from '../../auth/hooks/use-permissions';
import { Pagination } from '../../../components/ui/pagination';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../components/ui/query-state';
const RouteMap = lazy(() => import('./route-map'));
export function RouteMonitoring() {
  const [planPage, setPlanPage] = useState(1),
    [incidentPage, setIncidentPage] = useState(1);
  const client = useQueryClient(),
    canWrite = usePermission([
      'ADMIN',
      'LOGISTICS_ADMIN',
      'FLEET_SUPERVISOR',
      'TRAFFIC_COORDINATOR',
    ]);
  const plans = useQuery({
    queryKey: ['route-plans', planPage],
    queryFn: () => routePlans(planPage),
    refetchInterval: 30000,
  });
  const incidents = useQuery({
    queryKey: ['route-incidents', incidentPage],
    queryFn: () => routeIncidents(incidentPage),
    refetchInterval: 15000,
  });
  const vehicles = useQuery({
    queryKey: ['fleet', 'monitoring'],
    queryFn: () => listVehicles({ page: 1, pageSize: 100 }),
  });
  const acknowledge = useMutation({
    mutationFn: acknowledgeIncident,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['route-incidents'] });
    },
  });
  return (
    <>
      <section className="panel route-panel">
        <h2>Rutas operativas vigentes</h2>
        <p>
          Los parámetros son supuestos técnicos hasta validar el piloto.
          Posiciones antiguas y ausencia de señal no demuestran una parada.
        </p>
        {plans.isPending ? (
          <LoadingState message="Consultando planes…" />
        ) : plans.isError ? (
          <ErrorState
            message={plans.error.message}
            retry={() => {
              void plans.refetch();
            }}
          />
        ) : !plans.data.items.length ? (
          <EmptyState
            title="Sin rutas asignadas"
            description="Calcula un trayecto con un proveedor aprobado y asígnalo a un vehículo y sus envíos."
          />
        ) : (
          plans.data.items.map((plan) => {
            const vehicle = vehicles.data?.items.find(
                (v) => v.id === plan.vehicleId,
              ),
              position = vehicle?.position;
            return (
              <article key={plan.id}>
                <h3>
                  {vehicle?.plate ?? plan.vehicleId} · Ruta v{plan.version}
                </h3>
                <p>
                  Vigencia UTC: {plan.effectiveAt} · Envíos:{' '}
                  {plan.shipmentIds.length}
                </p>
                <p>
                  Corredor: {plan.parameters.corridorMeters} m · Confirmación:{' '}
                  {plan.parameters.confirmSeconds} s /{' '}
                  {plan.parameters.confirmObservations} muestras · Parada:{' '}
                  {plan.parameters.stopSeconds} s · Zonas autorizadas:{' '}
                  {plan.parameters.authorizedStops.length} · Asignó:{' '}
                  {plan.actorId}
                </p>
                <p>
                  Última posición:{' '}
                  {position
                    ? position.latitude +
                      ', ' +
                      position.longitude +
                      ' · Observada UTC ' +
                      position.observedAt
                    : 'Sin señal disponible'}
                </p>
                <Suspense fallback={<p>Cargando geometría…</p>}>
                  <RouteMap
                    route={{
                      coordinates: plan.geometry,
                      provider: 'osrm',
                      distanceMeters: 0,
                      durationSeconds: 0,
                      cached: false,
                      calculatedAt: plan.effectiveAt,
                    }}
                    position={position ?? undefined}
                  />
                </Suspense>
                <details>
                  <summary>Alternativa textual a la ruta</summary>
                  <p>Coordenadas [longitud, latitud] del corredor:</p>
                  <pre>{JSON.stringify(plan.geometry)}</pre>
                  <p>Envíos: {plan.shipmentIds.join(', ')}</p>
                </details>
              </article>
            );
          })
        )}
        {plans.data && <Pagination {...plans.data} onPage={setPlanPage} />}
      </section>
      <section className="panel operation-form">
        <h2>Incidencias de ruta</h2>
        {incidents.isPending ? (
          <LoadingState message="Consultando incidencias…" />
        ) : incidents.isError ? (
          <ErrorState
            message={incidents.error.message}
            retry={() => {
              void incidents.refetch();
            }}
          />
        ) : !incidents.data.items.length ? (
          <EmptyState
            title="Sin incidencias registradas"
            description="Solo observaciones válidas y una ruta vigente pueden confirmar desvíos o paradas."
          />
        ) : (
          <div className="table-scroll">
            <table>
              <caption>Incidencias e historial</caption>
              <thead>
                <tr>
                  <th>Tipo y vehículo</th>
                  <th>Estado</th>
                  <th>Última observación UTC</th>
                  <th>Historial y acción</th>
                </tr>
              </thead>
              <tbody>
                {incidents.data.items.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.kind === 'DEVIATION'
                        ? 'Desvío'
                        : 'Parada no programada'}
                      <small>
                        {r.plan.vehicleId} · v{r.plan.version}
                      </small>
                    </td>
                    <td>
                      {r.resolvedAt ? 'Resuelta' : 'Abierta'} ·{' '}
                      {r.acknowledgedAt ? 'Reconocida' : 'Sin reconocimiento'}
                    </td>
                    <td>{r.lastObservedAt}</td>
                    <td>
                      <details>
                        <summary>Ver historial</summary>
                        <ol>
                          {r.history.map((h, i) => (
                            <li key={i}>
                              {h.action} · {h.occurredAt} {h.note}
                            </li>
                          ))}
                        </ol>
                      </details>
                      {canWrite && !r.acknowledgedAt && (
                        <form
                          onSubmit={(event) => {
                            event.preventDefault();
                            acknowledge.mutate({
                              id: r.id,
                              expectedLastObservedAt: r.lastObservedAt,
                              note: String(
                                new FormData(event.currentTarget).get('note'),
                              ),
                            });
                          }}
                        >
                          <label>
                            Nota de reconocimiento
                            <input
                              name="note"
                              minLength={3}
                              maxLength={200}
                              required
                            />
                          </label>
                          <button
                            className="secondary-button"
                            disabled={acknowledge.isPending}
                          >
                            Reconocer
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {incidents.data && (
          <Pagination {...incidents.data} onPage={setIncidentPage} />
        )}
        {acknowledge.isError && <p role="alert">{acknowledge.error.message}</p>}
      </section>
    </>
  );
}
