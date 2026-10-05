import {
  Activity,
  ArrowUpRight,
  CircleAlert,
  Clock3,
  Package,
  RefreshCw,
  Truck,
  Warehouse,
  Wrench,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDashboard } from '../hooks/use-dashboard';
import { MetricCard } from '../components/metric-card';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../components/ui/query-state';
import { FleetMap } from '../../fleet/components/fleet-map';
import { ServiceHealthPanel } from '../../system-health/components/service-health-panel';
export function DashboardPage() {
  const summary = useDashboard();
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">VISIBILIDAD OPERATIVA</p>
          <h1>Resumen de operaciones</h1>
          <p className="muted">
            Una vista clara de tu logística, desde el origen hasta la entrega.
          </p>
        </div>
        <button
          className="secondary-button"
          disabled={summary.isFetching}
          onClick={() => {
            void summary.refetch();
          }}
        >
          <RefreshCw size={16} aria-hidden="true" />
          {summary.isFetching ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>
      {summary.isPending ? (
        <LoadingState message="Consultando métricas de la operación…" />
      ) : summary.isError ? (
        <ErrorState
          message={summary.error.message}
          retry={() => {
            void summary.refetch();
          }}
        />
      ) : (
        <>
          <div className="data-caption">
            <Activity size={14} aria-hidden="true" />
            <span>
              Información operativa · Actualizado{' '}
              {new Date(summary.data.generatedAt).toLocaleTimeString('es-MX')}
            </span>
          </div>
          {summary.data.pendingDeliveries === 0 &&
            summary.data.warehouseCapacityPercent === null && (
              <EmptyState
                title="La operación aún no tiene datos"
                description="Registra los primeros datos o ejecuta el seed de desarrollo para explorar el dashboard."
              />
            )}
          {summary.data.shipmentPeriodComparison && (
            <p className="data-caption">
              Nuevos envíos · Últimos 7 días:{' '}
              {summary.data.shipmentPeriodComparison.currentCreated} · 7 días
              anteriores:{' '}
              {summary.data.shipmentPeriodComparison.previousCreated}
            </p>
          )}
          <section className="metrics-grid" aria-label="Métricas operativas">
            <MetricCard
              title="Envíos activos"
              value={summary.data.activeShipments}
              caption="Actualmente en tránsito"
              icon={Package}
              accent
            />
            <MetricCard
              title="Capacidad de almacén"
              value={
                summary.data.warehouseCapacityPercent === null
                  ? '—'
                  : summary.data.warehouseCapacityPercent + '%'
              }
              caption="Unidades ocupadas / capacidad total"
              icon={Warehouse}
            />
            <MetricCard
              title="Flota disponible"
              value={summary.data.availableVehicles}
              caption="Vehículos listos para asignación"
              icon={Truck}
            />
            <MetricCard
              title="En mantenimiento"
              value={summary.data.vehiclesInMaintenance}
              caption="Vehículos fuera de operación"
              icon={Wrench}
            />
            <MetricCard
              title="Entregas pendientes"
              value={summary.data.pendingDeliveries}
              caption="Pendientes y en tránsito"
              icon={Clock3}
            />
            <MetricCard
              title="Alta prioridad"
              value={summary.data.highPriorityDeliveries}
              caption="Entregas pendientes prioritarias"
              icon={CircleAlert}
            />
          </section>
          <div className="dashboard-grid">
            <section className="panel fleet-panel">
              <div className="panel-heading">
                <div>
                  <h2>Panorama de flota</h2>
                  <p className="muted">Ubicación y seguimiento operativo</p>
                </div>
                <Link to="/fleet">
                  Ver flota <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
              </div>
              <FleetMap />
            </section>
            <ServiceHealthPanel />
            <section className="panel inventory-panel">
              <div className="panel-heading">
                <div>
                  <h2>Inventario crítico</h2>
                  <p className="muted">
                    Alertas recientes que requieren atención
                  </p>
                </div>
                <Link to="/inventory">
                  Ver inventario <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
              </div>
              {summary.data.inventoryAlerts.length === 0 ? (
                <EmptyState
                  title="Sin alertas recientes"
                  description="No hay alertas abiertas de inventario."
                />
              ) : (
                <div className="table-scroll">
                  <table>
                    <caption className="sr-only">
                      Alertas abiertas de inventario
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Artículo</th>
                        <th scope="col">Almacén</th>
                        <th scope="col">Existencia</th>
                        <th scope="col">Mínimo</th>
                        <th scope="col">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.data.inventoryAlerts.map((alert) => (
                        <tr key={alert.id}>
                          <td>
                            <strong>{alert.name}</strong>
                            <small>{alert.sku}</small>
                          </td>
                          <td>{alert.warehouse}</td>
                          <td>{alert.quantity}</td>
                          <td>{alert.minimumQuantity}</td>
                          <td>
                            <span className="critical-badge">Stock bajo</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
