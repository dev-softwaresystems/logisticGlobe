import { lazy, Suspense, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { VehicleStatus } from '@logistics-globe/shared';
import { listVehicles } from '../api/fleet';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../components/ui/query-state';
import type { FleetMapAdapter } from './map-adapter';
import { PositionDetails } from './position-details';
const LeafletMap = lazy(() => import('./leaflet-map'));
const defaultAdapter: FleetMapAdapter = { name: 'leaflet', View: LeafletMap };
export function FleetMap({
  adapter = defaultAdapter,
  search = '',
  status,
  selectedId,
  onSelect,
}: {
  adapter?: FleetMapAdapter;
  search?: string;
  status?: VehicleStatus;
  selectedId?: string;
  onSelect?: (id: string) => void;
}) {
  const [localSelection, setLocalSelection] = useState('');
  const [fitRequest, setFitRequest] = useState(0);
  const [centerRequest, setCenterRequest] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);
  const query = useQuery({
    queryKey: ['fleet', 'map', search, status],
    queryFn: () => listVehicles({ pageSize: 100, search, status }),
    refetchInterval: 15000,
  });
  if (query.isPending)
    return <LoadingState message="Consultando posiciones…" />;
  if (query.isError)
    return (
      <ErrorState
        message={query.error.message}
        retry={() => {
          void query.refetch();
        }}
      />
    );
  const positioned = query.data.items.filter((v) => v.position);
  const selection = selectedId ?? localSelection;
  const selected = query.data.items.find((v) => v.id === selection);
  const select = (id: string) => {
    if (onSelect) onSelect(id);
    else setLocalSelection(id);
  };
  const View = adapter.View;
  return (
    <>
      {query.data.items.some((v) => v.plate.startsWith('LGD-V1-')) && (
        <p className="panel-note">
          Flota LGD-V1- de DEMOSTRACIÓN · consulta el origen de cada
          observación; sin integración física validada.
        </p>
      )}
      {query.data.telemetryStatus === 'degraded' && (
        <p role="alert">
          Telemetría parcialmente disponible. Las posiciones faltantes se
          recuperarán cuando se restablezca el servicio.
        </p>
      )}
      <div className="filters map-controls">
        <label>
          Vehículo en el mapa
          <select
            value={selected?.id ?? ''}
            onChange={(e) => select(e.target.value)}
          >
            <option value="">Selecciona un vehículo</option>
            {query.data.items.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plate}
                {v.position ? '' : ' · Sin telemetría'}
              </option>
            ))}
          </select>
        </label>
        <button
          className="secondary-button"
          disabled={!selected?.position}
          onClick={() => setCenterRequest((n) => n + 1)}
        >
          Centrar vehículo
        </button>
        <button
          className="secondary-button"
          disabled={!positioned.length}
          onClick={() => setFitRequest((n) => n + 1)}
        >
          Mostrar flota visible
        </button>
      </div>
      {positioned.length ? (
        <Suspense fallback={<LoadingState message="Preparando mapa…" />}>
          <View
            vehicles={positioned}
            selectedId={selected?.id ?? ''}
            onSelect={select}
            fitRequest={fitRequest}
            centerRequest={centerRequest}
            now={now}
          />
        </Suspense>
      ) : (
        <EmptyState
          title="Sin posiciones recibidas"
          description="Conecta la telemetría o registra una observación desde la flota."
        />
      )}
      <p className="panel-note">
        {positioned.length} con posición ·{' '}
        {query.data.items.length - positioned.length} sin telemetría ·{' '}
        {query.data.total > 100
          ? 'Se muestran los primeros 100 vehículos; utiliza los filtros.'
          : 'Flota que coincide con los filtros.'}
      </p>
      <p className="map-legend">
        <span>● Verde: reciente (hasta 5 min)</span>
        <span>● Ámbar: desactualizada</span>
        <span>◎ Sin señal: solo en el listado</span>
      </p>
      {selected && (
        <section aria-label="Detalle del vehículo seleccionado">
          <PositionDetails vehicle={selected} now={now} />
        </section>
      )}
    </>
  );
}
