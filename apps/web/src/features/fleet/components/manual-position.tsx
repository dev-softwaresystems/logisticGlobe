import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { sendPosition } from '../api/fleet';
import { useOperationsRefresh } from '../../../hooks/use-operations';
export function ManualPosition({ vehicleId }: { vehicleId: string }) {
  const refresh = useOperationsRefresh();
  const previous = useRef<{ signature: string; id: string } | null>(null);
  const position = useMutation({
    mutationFn: sendPosition,
    onSuccess: () => {
      previous.current = null;
      refresh();
    },
  });
  const [localNow] = useState(() =>
    new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 19),
  );
  return (
    <form
      className="inline-form"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const optional = (key: string) =>
          String(form.get(key) ?? '').trim()
            ? Number(form.get(key))
            : undefined;
        const body = {
          vehicleId,
          latitude: Number(form.get('latitude')),
          longitude: Number(form.get('longitude')),
          observedAt: new Date(String(form.get('observedAt'))).toISOString(),
          accuracyMeters: optional('accuracyMeters'),
          speedKph: optional('speedKph'),
          headingDegrees: optional('headingDegrees'),
        };
        const signature = JSON.stringify(body);
        if (previous.current?.signature !== signature)
          previous.current = { signature, id: crypto.randomUUID() };
        position.mutate({ ...body, id: previous.current.id });
      }}
    >
      <p className="panel-note">
        Registro manual para el vehículo seleccionado. Guarda una observación
        trazable; no conecta un dispositivo ni demuestra su ubicación física.
        Una observación antigua permanece en el historial y no sustituye una más
        reciente.
      </p>
      <label>
        Latitud
        <input
          name="latitude"
          type="number"
          min={-90}
          max={90}
          step="any"
          required
        />
      </label>
      <label>
        Longitud
        <input
          name="longitude"
          type="number"
          min={-180}
          max={180}
          step="any"
          required
        />
      </label>
      <label>
        Fecha y hora de observación (hora local)
        <input
          name="observedAt"
          type="datetime-local"
          step="1"
          defaultValue={localNow}
          required
        />
      </label>
      <label>
        Precisión (m, opcional)
        <input
          name="accuracyMeters"
          type="number"
          min={0}
          max={10000}
          step="any"
        />
      </label>
      <label>
        Velocidad (km/h, opcional)
        <input name="speedKph" type="number" min={0} max={200} step="any" />
      </label>
      <label>
        Rumbo (°, opcional)
        <input
          name="headingDegrees"
          type="number"
          min={0}
          max={359.999}
          step="any"
        />
      </label>
      <button className="secondary-button" disabled={position.isPending}>
        {position.isPending
          ? 'Guardando observación…'
          : 'Registrar observación'}
      </button>
      {position.isError && (
        <p role="alert">
          {position.error.message} Puedes reintentar sin duplicar la misma
          observación.
        </p>
      )}
      {position.isSuccess && <p role="status">Observación registrada.</p>}
    </form>
  );
}
