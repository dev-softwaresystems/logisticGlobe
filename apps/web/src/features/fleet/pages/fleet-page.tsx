import type { VehicleStatus } from '@logistics-globe/shared';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { FleetMap } from '../components/fleet-map';
import { VehicleTable } from '../components/vehicle-table';
import { VehicleHistory } from '../components/vehicle-history';
import { listVehicles, createVehicle, changeVehicle } from '../api/fleet';
import { usePermission } from '../../auth/hooks/use-permissions';
import { useOperationsRefresh } from '../../../hooks/use-operations';
import { Pagination } from '../../../components/ui/pagination';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../components/ui/query-state';
export function FleetPage() {
  const [status, setStatus] = useState<VehicleStatus | ''>('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState('');
  const query = useQuery({
    queryKey: ['fleet', page, search, status],
    queryFn: () => listVehicles({ page, search, status: status || undefined }),
    refetchInterval: 15000,
  });
  const canWrite = usePermission([
    'ADMIN',
    'LOGISTICS_ADMIN',
    'FLEET_SUPERVISOR',
  ]);
  const refresh = useOperationsRefresh();
  const create = useMutation({
    mutationFn: createVehicle,
    onSuccess: () => refresh(),
  });
  const change = useMutation({
    mutationFn: changeVehicle,
    onSuccess: () => refresh(),
    onError: () => {
      void query.refetch();
    },
  });
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">VISIBILIDAD DE VEHÍCULOS</p>
          <h1>Flota</h1>
          <p className="muted">
            Posiciones recibidas, disponibilidad y mantenimiento.
          </p>
        </div>
      </div>
      <section className="panel">
        <FleetMap
          search={search}
          status={status || undefined}
          selectedId={selected}
          onSelect={setSelected}
        />
      </section>
      <div className="filters">
        <label>
          Estado de flota
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as VehicleStatus | '');
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            <option value="AVAILABLE">Disponible</option>
            <option value="ON_ROUTE">En ruta</option>
            <option value="MAINTENANCE">Mantenimiento</option>
          </select>
        </label>
        <label>
          Buscar matrícula
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            maxLength={100}
          />
        </label>
        {canWrite && (
          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate(String(new FormData(e.currentTarget).get('plate')));
            }}
          >
            <label>
              Nueva matrícula
              <input name="plate" required minLength={3} maxLength={32} />
            </label>
            <button className="secondary-button" disabled={create.isPending}>
              Registrar vehículo
            </button>
          </form>
        )}
      </div>
      {(create.isError || change.isError) && (
        <p role="alert" className="form-error">
          {create.error?.message ?? change.error?.message}
        </p>
      )}
      {query.isPending ? (
        <LoadingState message="Consultando flota…" />
      ) : query.isError ? (
        <ErrorState
          message={query.error.message}
          retry={() => {
            void query.refetch();
          }}
        />
      ) : (
        <section className="panel">
          {query.data.telemetryStatus === 'degraded' && (
            <p role="alert" className="panel-note">
              MongoDB no está disponible. El estado transaccional de los
              vehículos sigue disponible.
            </p>
          )}
          {!query.data.items.length ? (
            <EmptyState
              title="Sin vehículos"
              description="Registra un vehículo o cambia la búsqueda."
            />
          ) : (
            <VehicleTable
              vehicles={query.data.items}
              checkedAt={query.dataUpdatedAt}
              canWrite={canWrite}
              busy={change.isPending}
              onTrack={setSelected}
              onStatus={(v) =>
                change.mutate({
                  id: v.id,
                  expectedUpdatedAt: v.updatedAt,
                  status:
                    v.status === 'MAINTENANCE' ? 'AVAILABLE' : 'MAINTENANCE',
                })
              }
            />
          )}
          <Pagination {...query.data} onPage={setPage} />
        </section>
      )}
      {selected && (
        <VehicleHistory
          key={selected}
          id={selected}
          plate={
            query.data?.items.find((v) => v.id === selected)?.plate ?? selected
          }
          canWrite={canWrite}
        />
      )}
    </>
  );
}
