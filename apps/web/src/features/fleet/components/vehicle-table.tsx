import type { Vehicle } from '@logistics-globe/shared';
const labels = {
  AVAILABLE: 'Disponible',
  ON_ROUTE: 'En ruta',
  MAINTENANCE: 'Mantenimiento',
};
export function VehicleTable({
  vehicles,
  checkedAt,
  canWrite,
  busy,
  onTrack,
  onStatus,
}: {
  vehicles: Vehicle[];
  checkedAt: number;
  canWrite: boolean;
  busy: boolean;
  onTrack: (id: string) => void;
  onStatus: (vehicle: Vehicle) => void;
}) {
  return (
    <div className="table-scroll">
      <table>
        <caption className="sr-only">Estado de la flota</caption>
        <thead>
          <tr>
            <th>Matrícula</th>
            <th>Estado</th>
            <th>Última posición</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map((v) => (
            <tr key={v.id}>
              <td>{v.plate}</td>
              <td>{labels[v.status]}</td>
              <td>
                {v.position ? (
                  <>
                    <strong>
                      {v.position.latitude.toFixed(5)},{' '}
                      {v.position.longitude.toFixed(5)}
                    </strong>
                    <small>
                      {new Date(v.position.observedAt).toLocaleString('es-MX')}{' '}
                      {checkedAt - Date.parse(v.position.observedAt) > 300000
                        ? '· Desactualizada'
                        : ''}
                    </small>
                  </>
                ) : (
                  'Sin telemetría'
                )}
              </td>
              <td>
                <div className="form-actions">
                  <button
                    className="secondary-button"
                    onClick={() => onTrack(v.id)}
                  >
                    Seguimiento
                  </button>
                  {canWrite && v.status !== 'ON_ROUTE' && (
                    <button
                      className="secondary-button"
                      disabled={busy}
                      onClick={() => onStatus(v)}
                    >
                      {v.status === 'MAINTENANCE'
                        ? 'Habilitar'
                        : 'Mantenimiento'}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
