import { positionAge } from '../position-state';
import type { Vehicle } from '@logistics-globe/shared';
const vehicleStatus = {
  AVAILABLE: 'Disponible',
  ON_ROUTE: 'En ruta',
  MAINTENANCE: 'Mantenimiento',
};
export function PositionDetails({
  vehicle,
  now,
}: {
  vehicle: Vehicle;
  now: number;
}) {
  const p = vehicle.position;
  return (
    <div className="position-details">
      <strong>
        {vehicle.plate} · {vehicleStatus[vehicle.status]}
      </strong>
      <small>ID: {vehicle.id}</small>
      <p>{positionAge(p, now)}</p>
      {p && (
        <>
          <p>
            {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)} ·{' '}
            <time dateTime={p.observedAt}>
              {new Date(p.observedAt).toLocaleString('es-MX')}
            </time>
          </p>
          <p>
            Origen:{' '}
            {p.source === 'simulated'
              ? 'Simulación · DEMOSTRACIÓN'
              : p.source === 'manual'
                ? 'Registro manual'
                : p.source === 'device'
                  ? 'Integración GPS'
                  : 'No identificado (histórico)'}
          </p>
          <p>
            Velocidad: {p.speedKph === undefined ? 'N/D' : p.speedKph + ' km/h'}{' '}
            · Rumbo:{' '}
            {p.headingDegrees === undefined ? 'N/D' : p.headingDegrees + '°'} ·
            Precisión:{' '}
            {p.accuracyMeters === undefined ? 'N/D' : p.accuracyMeters + ' m'}
          </p>
        </>
      )}
      <p>
        Capacidad nominal:{' '}
        {vehicle.capacityKg
          ? vehicle.capacityKg.toLocaleString('es-MX') + ' kg'
          : 'N/D'}
      </p>
      <p>
        Envíos pendientes/en tránsito:{' '}
        {vehicle.assignedShipments?.map((s) => s.reference).join(', ') ||
          'Sin asignaciones'}
      </p>
    </div>
  );
}
