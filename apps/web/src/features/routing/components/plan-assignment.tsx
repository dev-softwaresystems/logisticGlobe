import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { RoutingRequest } from '@logistics-globe/shared';
import { assignPlan } from '../api/monitoring';
import { usePermission } from '../../auth/hooks/use-permissions';
export function PlanAssignment({ input }: { input: RoutingRequest }) {
  const requestRef = useRef<{ payload: string; id: string } | null>(null);
  const client = useQueryClient(),
    canWrite = usePermission([
      'ADMIN',
      'LOGISTICS_ADMIN',
      'FLEET_SUPERVISOR',
      'TRAFFIC_COORDINATOR',
    ]);
  const mutation = useMutation({
    mutationFn: assignPlan,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['route-plans'] });
    },
  });
  if (!canWrite) return null;
  return (
    <form
      className="operation-form"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const payload = {
          ...input,
          vehicleId: String(data.get('vehicleId')).trim(),
          shipmentIds: String(data.get('shipmentIds'))
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          corridorMeters: Number(data.get('corridor')),
          confirmSeconds: 60,
          confirmObservations: 3,
          stopSeconds: Number(data.get('stopSeconds')),
          stopRadiusMeters: 30,
          maxGapSeconds: 120,
          maxAccuracyMeters: 100,
          authorizedStops: data.get('stopReference')
            ? [
                {
                  reference: String(data.get('stopReference')).trim(),
                  latitude: Number(data.get('stopLatitude')),
                  longitude: Number(data.get('stopLongitude')),
                  radiusMeters: Number(data.get('stopRadius')),
                },
              ]
            : [],
        };
        const fingerprint = JSON.stringify(payload);
        if (requestRef.current?.payload !== fingerprint)
          requestRef.current = {
            payload: fingerprint,
            id: crypto.randomUUID(),
          };
        mutation.mutate({ ...payload, requestId: requestRef.current.id });
      }}
    >
      <h3>Asignar ruta operativa</h3>
      <p>
        Usa los IDs del vehículo y de uno o varios envíos asignados que estén
        pendientes o en tránsito. Asignar una ruta nueva reemplaza la versión
        vigente.
      </p>
      <label>
        ID del vehículo
        <input name="vehicleId" required />
      </label>
      <label>
        IDs de envíos separados por coma
        <input name="shipmentIds" required />
      </label>
      <label>
        Tolerancia del corredor (metros)
        <input
          name="corridor"
          type="number"
          min={20}
          max={5000}
          defaultValue={200}
          required
        />
      </label>
      <label>
        Confirmación de parada (segundos)
        <input
          name="stopSeconds"
          type="number"
          min={121}
          max={7200}
          defaultValue={300}
          required
        />
      </label>
      <fieldset>
        <legend>Parada autorizada opcional</legend>
        <label>
          Referencia
          <input name="stopReference" maxLength={80} />
        </label>
        <label>
          Latitud
          <input
            name="stopLatitude"
            type="number"
            step="any"
            min={-90}
            max={90}
          />
        </label>
        <label>
          Longitud
          <input
            name="stopLongitude"
            type="number"
            step="any"
            min={-180}
            max={180}
          />
        </label>
        <label>
          Radio (metros)
          <input
            name="stopRadius"
            type="number"
            min={20}
            max={1000}
            defaultValue={100}
          />
        </label>
      </fieldset>
      <button className="primary-button" disabled={mutation.isPending}>
        Asignar ruta
      </button>
      {mutation.isError && <p role="alert">{mutation.error.message}</p>}
      {mutation.isSuccess && (
        <p role="status">Ruta asignada. Versión {mutation.data.version}.</p>
      )}
    </form>
  );
}
