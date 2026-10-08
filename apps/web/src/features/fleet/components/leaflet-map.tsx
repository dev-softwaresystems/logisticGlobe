import { useEffect, useRef, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from 'react-leaflet';
import type { LatLngTuple } from 'leaflet';
import type { FleetMapProviderProps } from './map-adapter';
import { PositionDetails } from './position-details';
import { environment } from '../../../lib/environment';
import 'leaflet/dist/leaflet.css';
function ViewControls({
  vehicles,
  selectedId,
  fitRequest,
  centerRequest,
}: FleetMapProviderProps) {
  const map = useMap();
  const fitted = useRef(-1),
    centered = useRef(0);
  useEffect(() => {
    map.invalidateSize();
    if (fitted.current !== fitRequest && vehicles.length) {
      fitted.current = fitRequest;
      map.fitBounds(
        vehicles.flatMap((v) =>
          v.position
            ? [[v.position.latitude, v.position.longitude] as LatLngTuple]
            : [],
        ),
        { padding: [40, 40], maxZoom: 12, animate: false },
      );
    }
    if (centered.current !== centerRequest) {
      centered.current = centerRequest;
      const p = vehicles.find((v) => v.id === selectedId)?.position;
      if (p) map.setView([p.latitude, p.longitude], 13, { animate: false });
    }
  }, [map, vehicles, selectedId, fitRequest, centerRequest]);
  return null;
}
export default function LeafletMap(props: FleetMapProviderProps) {
  const { vehicles, selectedId, onSelect, now } = props;
  const first = vehicles.find((v) => v.position)?.position;
  const [tiles, setTiles] = useState<'pending' | 'loaded' | 'error'>('pending');
  if (!first) return null;
  return (
    <div
      className="live-map"
      role="region"
      aria-label="Mapa geográfico de posiciones recibidas"
    >
      <MapContainer
        center={[first.latitude, first.longitude]}
        zoom={6}
        scrollWheelZoom={false}
        zoomAnimation={false}
        className={environment.mapTileUrl ? '' : 'local-map'}
        style={{ height: 340, width: '100%' }}
      >
        {environment.mapTileUrl && (
          <TileLayer
            url={environment.mapTileUrl}
            attribution={environment.mapAttribution}
            eventHandlers={{
              tileload: () =>
                setTiles((current) =>
                  current === 'error' ? 'error' : 'loaded',
                ),
              tileerror: () => setTiles('error'),
            }}
          />
        )}
        <ViewControls {...props} />
        {vehicles.map(
          (vehicle) =>
            vehicle.position && (
              <CircleMarker
                key={vehicle.id}
                center={[vehicle.position.latitude, vehicle.position.longitude]}
                radius={vehicle.id === selectedId ? 12 : 9}
                pathOptions={{
                  color: vehicle.id === selectedId ? '#102f3a' : '#194a59',
                  weight: vehicle.id === selectedId ? 4 : 2,
                  fillColor:
                    now - Date.parse(vehicle.position.observedAt) > 300000
                      ? '#ba6b19'
                      : '#268168',
                  fillOpacity: 0.9,
                }}
                eventHandlers={{ click: () => onSelect(vehicle.id) }}
              >
                <Popup>
                  <PositionDetails vehicle={vehicle} now={now} />
                </Popup>
              </CircleMarker>
            ),
        )}
      </MapContainer>
      <p className="panel-note" role="status">
        {!environment.mapTileUrl
          ? 'Mapa local de coordenadas · Sin cartografía externa configurada. Los puntos no representan rutas calculadas.'
          : tiles === 'error'
            ? 'Algunas capas cartográficas no cargaron. Revisa el proveedor; el listado conserva las coordenadas.'
            : tiles === 'loaded'
              ? 'Capas cartográficas recibidas del proveedor configurado.'
              : 'Cargando cartografía del proveedor configurado…'}
      </p>
    </div>
  );
}
