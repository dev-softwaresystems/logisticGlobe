import { useMutation, useQuery } from '@tanstack/react-query';
import { createShipment } from '../api/shipments';
import { listVehicles } from '../../fleet/api/fleet';
import { useOperationsRefresh } from '../../../hooks/use-operations';
export function ShipmentForm({ onCreated }: { onCreated: () => void }) {
  const refresh = useOperationsRefresh();
  const vehicles = useQuery({
    queryKey: ['fleet', 'assignment'],
    queryFn: () => listVehicles({ pageSize: 100 }),
  });
  const mutation = useMutation({
    mutationFn: createShipment,
    onSuccess: async () => {
      await refresh();
      onCreated();
    },
  });
  return (
    <form
      className="operation-form panel"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const vehicleId = String(data.get('vehicleId') ?? '');
        mutation.mutate({
          reference: String(data.get('reference')),
          origin: String(data.get('origin')),
          destination: String(data.get('destination')),
          priority: data.get('priority') === 'HIGH' ? 'HIGH' : 'NORMAL',
          ...(vehicleId ? { vehicleId } : {}),
        });
      }}
    >
      <h2>Registrar envío</h2>
      <label>
        Referencia única
        <input
          name="reference"
          required
          minLength={3}
          maxLength={64}
          pattern="[A-Za-z0-9_-]+"
          placeholder="ENV-2026-001"
        />
      </label>
      <label>
        Origen
        <input name="origin" required minLength={2} maxLength={200} />
      </label>
      <label>
        Destino
        <input name="destination" required minLength={2} maxLength={200} />
      </label>
      <label>
        Prioridad
        <select name="priority">
          <option value="NORMAL">Normal</option>
          <option value="HIGH">Alta</option>
        </select>
      </label>
      <label>
        Vehículo
        <select name="vehicleId">
          <option value="">Asignar al iniciar tránsito</option>
          {vehicles.data?.items
            .filter((v) => v.status !== 'MAINTENANCE')
            .map((v) => (
              <option value={v.id} key={v.id}>
                {v.plate}
              </option>
            ))}
        </select>
      </label>
      {vehicles.isError && (
        <p role="alert">
          No se pudo cargar la flota. Puedes asignarla después.
        </p>
      )}
      {mutation.isError && (
        <p role="alert" className="form-error">
          {mutation.error.message}
        </p>
      )}
      <div className="form-actions">
        <button
          type="submit"
          className="primary-button"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? 'Guardando…' : 'Guardar envío'}
        </button>
        <button type="button" className="secondary-button" onClick={onCreated}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
