import { useMutation } from '@tanstack/react-query';
import { downloadExecutiveReport } from '../api/reports';
export function ExecutiveExport() {
  const mutation = useMutation({
    mutationFn: ({
      format,
      from,
      to,
      status,
      priority,
    }: {
      format: 'pdf' | 'xlsx';
      from?: string;
      to?: string;
      status?: string;
      priority?: string;
    }) => downloadExecutiveReport(format, { from, to, status, priority }),
  });
  return (
    <section className="panel operation-form">
      <h2>Reporte ejecutivo</h2>
      <p>
        Las métricas e inventario representan el estado actual al corte. El
        periodo filtra envíos creados (máximo 31 días). Horas introducidas en
        UTC.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const value = (name: string) => {
            const raw = String(data.get(name) ?? '');
            return raw ? new Date(raw + 'Z').toISOString() : undefined;
          };
          const format = data.get('format') === 'xlsx' ? 'xlsx' : 'pdf';
          mutation.mutate({
            format,
            from: value('from'),
            to: value('to'),
            status: String(data.get('status')) || undefined,
            priority: String(data.get('priority')) || undefined,
          });
        }}
      >
        <label>
          Desde (UTC)
          <input type="datetime-local" name="from" />
        </label>
        <label>
          Hasta (UTC)
          <input type="datetime-local" name="to" />
        </label>
        <label>
          Formato
          <select name="format">
            <option value="pdf">PDF</option>
            <option value="xlsx">Excel XLSX</option>
          </select>
        </label>
        <label>
          Estado de los envíos
          <select name="status">
            <option value="">Todos</option>
            <option value="PENDING">Pendiente</option>
            <option value="IN_TRANSIT">En tránsito</option>
            <option value="DELIVERED">Entregado</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
        </label>
        <label>
          Prioridad de los envíos
          <select name="priority">
            <option value="">Todas</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">Alta</option>
          </select>
        </label>
        <button className="primary-button" disabled={mutation.isPending}>
          {mutation.isPending ? 'Preparando…' : 'Descargar reporte ejecutivo'}
        </button>
      </form>
      {mutation.isError && <p role="alert">{mutation.error.message}</p>}
      {mutation.isSuccess && (
        <p role="status">Archivo preparado para descargar.</p>
      )}
    </section>
  );
}
