import { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from 'react-leaflet';
import type { LatLngTuple } from 'leaflet';
import type { FleetMapProviderProps } from './map-adapter';
import { environment } from '../../../lib/environment';
import 'leaflet/dist/leaflet.css';
function FitPositions({ points }: { points: LatLngTuple[] }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    if (points.length)
      map.fitBounds(points, { padding: [40, 40], maxZoom: 12 });
  }, [map, points]);
  return null;
}
export default function LeafletMap({ vehicles }: FleetMapProviderProps) {
  const points: LatLngTuple[] = vehicles.flatMap((v) =>
    v.position
      ? [[v.position.latitude, v.position.longitude] as LatLngTuple]
      : [],
  );
  return (
    <div
      className="live-map"
      role="region"
      aria-label="Mapa geográfico de posiciones recibidas"
    >
      <MapContainer
        center={points[0] ?? [19.43, -99.13]}
        zoom={6}
        scrollWheelZoom={false}
        className={environment.mapTileUrl ? '' : 'local-map'}
        style={{ height: 340, width: '100%' }}
      >
        {environment.mapTileUrl && (
          <TileLayer
            url={environment.mapTileUrl}
            attribution={environment.mapAttribution}
          />
        )}
        <FitPositions points={points} />
        {vehicles
          .filter((v) => v.position)
          .map((vehicle) => (
            <CircleMarker
              key={vehicle.id}
              center={[vehicle.position!.latitude, vehicle.position!.longitude]}
              radius={9}
              pathOptions={{
                color: '#194a59',
                fillColor: '#5cbda0',
                fillOpacity: 0.9,
              }}
            >
              <Popup>
                <strong>{vehicle.plate}</strong>
                <br />
                {vehicle.position!.latitude.toFixed(5)},{' '}
                {vehicle.position!.longitude.toFixed(5)}
                <br />
                {new Date(vehicle.position!.observedAt).toLocaleString('es-MX')}
              </Popup>
            </CircleMarker>
          ))}
      </MapContainer>
      {!environment.mapTileUrl && (
        <p className="panel-note">
          Proveedor local sin cartografía externa · Las posiciones utilizan
          coordenadas recibidas.
        </p>
      )}
    </div>
  );
}
