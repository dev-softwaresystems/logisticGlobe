import { lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Radio } from 'lucide-react';
import { listVehicles } from '../api/fleet';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../components/ui/query-state';
import type { FleetMapAdapter } from './map-adapter';
const LeafletMap = lazy(() => import('./leaflet-map'));
const defaultAdapter: FleetMapAdapter = { name: 'leaflet', View: LeafletMap };
export function FleetMap({
  adapter = defaultAdapter,
}: {
  adapter?: FleetMapAdapter;
}) {
  const query = useQuery({
    queryKey: ['fleet', 'map'],
    queryFn: () => listVehicles({ pageSize: 100 }),
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
  if (query.data.telemetryStatus === 'degraded')
    return (
      <ErrorState
        message="La telemetría no está disponible. Las posiciones se recuperarán al restablecer MongoDB."
        retry={() => {
          void query.refetch();
        }}
      />
    );
  const positioned = query.data.items.filter((v) => v.position);
  if (!positioned.length)
    return (
      <div className="map-placeholder">
        <span className="map-location" aria-hidden="true">
          <MapPin size={28} />
        </span>
        <EmptyState
          title="Sin posiciones recibidas"
          description="Conecta la telemetría o registra una observación desde la flota."
        />
        <span className="map-tag">
          <Radio size={13} aria-hidden="true" />
          Sin telemetría conectada
        </span>
      </div>
    );
  const View = adapter.View;
  return (
    <>
      <Suspense fallback={<LoadingState message="Preparando mapa…" />}>
        <View vehicles={positioned} />
      </Suspense>
      <p className="panel-note">
        {positioned.length} vehículos con posición · Observaciones de más de 5
        minutos pueden estar desactualizadas.
      </p>
    </>
  );
}
