import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import type { ShipmentStatus } from '@logistics-globe/shared';
import { changeShipment, shipmentDetail } from '../api/shipments';
import { listVehicles } from '../../fleet/api/fleet';
import { usePermission } from '../../auth/hooks/use-permissions';
import { useOperationsRefresh } from '../../../hooks/use-operations';
import { ErrorState, LoadingState } from '../../../components/ui/query-state';
export function ShipmentPage() {
  const { id = '' } = useParams();
  const refresh = useOperationsRefresh();
  const [vehicleId, setVehicleId] = useState('');
  const query = useQuery({
    queryKey: ['shipment', id],
    queryFn: () => shipmentDetail(id),
    refetchInterval: 30000,
  });
  const vehicles = useQuery({
    queryKey: ['fleet', 'assignment'],
    queryFn: () => listVehicles({ pageSize: 100 }),
  });
  const canWrite = usePermission([
    'ADMIN',
    'LOGISTICS_ADMIN',
    'TRAFFIC_COORDINATOR',
  ]);
  const mutation = useMutation({
    mutationFn: changeShipment,
    onSuccess: () => refresh(),
    onError: () => {
      void query.refetch();
    },
  });
  if (query.isPending)
    return <LoadingState message="Consultando seguimiento…" />;
  if (query.isError)
    return (
      <ErrorState
        message={query.error.message}
        retry={() => {
          void query.refetch();
        }}
      />
    );
  const shipment = query.data;
  const update = (status: ShipmentStatus) =>
    mutation.mutate({
      id,
      status,
      expectedUpdatedAt: shipment.updatedAt,
      ...(vehicleId ? { vehicleId } : {}),
    });
  return (
    <>
      <Link to="/shipments">← Volver a envíos</Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">SEGUIMIENTO DE ENTREGA</p>
          <h1>{shipment.reference}</h1>
          <p className="muted">
            {shipment.origin} → {shipment.destination}
          </p>
        </div>
        <span className="critical-badge">{shipment.status}</span>
      </div>
      <section className="panel operation-form">
        <h2>Operación</h2>
        <p>Prioridad: {shipment.priority === 'HIGH' ? 'Alta' : 'Normal'}</p>
        <p>Vehículo: {shipment.vehicle?.plate ?? 'Sin asignar'}</p>
        {canWrite && shipment.status === 'PENDING' && (
          <label>
            Vehículo para iniciar tránsito
            <select
              value={vehicleId || shipment.vehicleId || ''}
              onChange={(e) => setVehicleId(e.target.value)}
            >
              <option value="">Seleccionar vehículo</option>
              {vehicles.data?.items
                .filter((v) => v.status !== 'MAINTENANCE')
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate}
                  </option>
                ))}
            </select>
          </label>
        )}
        {canWrite && (
          <div className="form-actions">
            {shipment.status === 'PENDING' && (
              <button
                className="secondary-button"
                disabled={
                  mutation.isPending || !(vehicleId || shipment.vehicleId)
                }
                onClick={() => update('IN_TRANSIT')}
              >
                Iniciar tránsito
              </button>
            )}
            {shipment.status === 'IN_TRANSIT' && (
              <button
                className="secondary-button"
                disabled={mutation.isPending}
                onClick={() => update('DELIVERED')}
              >
                Confirmar entrega
              </button>
            )}
            {['PENDING', 'IN_TRANSIT'].includes(shipment.status) && (
              <button
                className="secondary-button"
                disabled={mutation.isPending}
                onClick={() => update('CANCELLED')}
              >
                Cancelar envío
              </button>
            )}
          </div>
        )}
        {mutation.isError && (
          <p role="alert" className="form-error">
            {mutation.error.message}
          </p>
        )}
      </section>
      <section className="panel operation-form">
        <h2>Historial de estados</h2>
        <ol className="timeline">
          {shipment.history.map((entry) => (
            <li key={entry.id}>
              <strong>{entry.status}</strong> ·{' '}
              <time dateTime={entry.occurredAt}>
                {new Date(entry.occurredAt).toLocaleString('es-MX')}
              </time>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
