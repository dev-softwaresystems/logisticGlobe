import { MapContainer, TileLayer, Polyline } from 'react-leaflet';
import type { RoutingResult } from '@logistics-globe/shared';
import { environment } from '../../../lib/environment';
import 'leaflet/dist/leaflet.css';
export default function RouteMap({ route }: { route: RoutingResult }) {
  const points = route.coordinates.map(
    ([longitude, latitude]) => [latitude, longitude] as [number, number],
  );
  return (
    <div className="live-map" role="region" aria-label="Ruta calculada">
      <MapContainer
        bounds={points}
        boundsOptions={{ padding: [20, 20] }}
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
        <Polyline positions={points} pathOptions={{ color: '#194a59' }} />
      </MapContainer>
      {!environment.mapTileUrl && (
        <p>
          Ruta del proveedor configurado sobre el mapa local de coordenadas.
        </p>
      )}
    </div>
  );
}
