import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { ShipmentPriority, ShipmentStatus } from '@logistics-globe/shared';
import { listShipments } from '../api/shipments';
import { ShipmentForm } from '../components/shipment-form';
import { downloadReport } from '../../reports/api/reports';
import { usePermission } from '../../auth/hooks/use-permissions';
import { Pagination } from '../../../components/ui/pagination';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../components/ui/query-state';
const labels: Record<ShipmentStatus, string> = {
  PENDING: 'Pendiente',
  IN_TRANSIT: 'En tránsito',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};
export function ShipmentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ShipmentStatus | ''>('');
  const [priority, setPriority] = useState<ShipmentPriority | ''>('');
  const [creating, setCreating] = useState(false);
  const params = {
    page,
    search,
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
  };
  const query = useQuery({
    queryKey: ['shipments', params],
    queryFn: () => listShipments(params),
    refetchInterval: 30000,
  });
  const canWrite = usePermission([
    'ADMIN',
    'LOGISTICS_ADMIN',
    'TRAFFIC_COORDINATOR',
  ]);
  const report = useMutation({
    mutationFn: () => downloadReport('shipments', params),
  });
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">TRÁFICO Y ENTREGAS</p>
          <h1>Envíos</h1>
          <p className="muted">
            Registro, prioridades y seguimiento de cada entrega.
          </p>
        </div>
        <div className="form-actions">
          <button
            className="secondary-button"
            onClick={() => report.mutate()}
            disabled={report.isPending}
          >
            Exportar CSV
          </button>
          {canWrite && (
            <button
              className="secondary-button"
              onClick={() => setCreating(!creating)}
            >
              Registrar envío
            </button>
          )}
        </div>
      </div>
      {creating && <ShipmentForm onCreated={() => setCreating(false)} />}
      <form
        className="filters"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
        }}
      >
        <label>
          Buscar
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            maxLength={100}
            placeholder="Referencia, origen o destino"
          />
        </label>
        <label>
          Estado
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as ShipmentStatus | '');
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            {Object.entries(labels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Prioridad
          <select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value as ShipmentPriority | '');
              setPage(1);
            }}
          >
            <option value="">Todas</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">Alta</option>
          </select>
        </label>
      </form>
      {report.isError && (
        <p role="alert" className="form-error">
          {report.error.message}
        </p>
      )}
      {query.isPending ? (
        <LoadingState message="Consultando envíos…" />
      ) : query.isError ? (
        <ErrorState
          message={query.error.message}
          retry={() => {
            void query.refetch();
          }}
        />
      ) : (
        <section className="panel">
          {query.data.items.length === 0 ? (
            <EmptyState
              title="Sin envíos para estos filtros"
              description="Registra un envío o cambia los filtros."
            />
          ) : (
            <div className="table-scroll">
              <table>
                <caption className="sr-only">Envíos registrados</caption>
                <thead>
                  <tr>
                    <th>Referencia</th>
                    <th>Ruta</th>
                    <th>Estado</th>
                    <th>Prioridad</th>
                    <th>Creado</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.items.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <Link to={'/shipments/' + row.id}>{row.reference}</Link>
                      </td>
                      <td>
                        <strong>{row.origin}</strong>
                        <small>{row.destination}</small>
                      </td>
                      <td>{labels[row.status]}</td>
                      <td>
                        {row.priority === 'HIGH' ? (
                          <span className="critical-badge">Alta</span>
                        ) : (
                          'Normal'
                        )}
                      </td>
                      <td>
                        {new Date(row.createdAt).toLocaleDateString('es-MX')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination {...query.data} onPage={setPage} />
        </section>
      )}
    </>
  );
}
