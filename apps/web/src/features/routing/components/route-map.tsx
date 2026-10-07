import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Tooltip,
} from 'react-leaflet';
import type { RoutingResult, Position } from '@logistics-globe/shared';
import { environment } from '../../../lib/environment';
import 'leaflet/dist/leaflet.css';
export default function RouteMap({
  route,
  position,
}: {
  route: RoutingResult;
  position?: Position;
}) {
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
        {position && (
          <CircleMarker
            center={[position.latitude, position.longitude]}
            radius={7}
            pathOptions={{ color: '#a33b3b' }}
          >
            <Tooltip>Última posición observada: {position.observedAt}</Tooltip>
          </CircleMarker>
        )}
      </MapContainer>
      {!environment.mapTileUrl && (
        <p>
          Ruta del proveedor configurado sobre el mapa local de coordenadas.
        </p>
      )}
    </div>
  );
}
