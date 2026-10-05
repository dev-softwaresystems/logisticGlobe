import { useMutation } from '@tanstack/react-query';
import { downloadReport } from '../api/reports';
export function ReportsPage() {
  const mutation = useMutation({
    mutationFn: (name: 'shipments' | 'inventory') => downloadReport(name),
  });
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">INFORMACIÓN EXPORTABLE</p>
          <h1>Reportes</h1>
          <p className="muted">CSV UTF-8 con datos actuales de la operación.</p>
        </div>
      </div>
      <section className="panel operation-form">
        <h2>Exportar datos</h2>
        <p>
          La exportación de envíos también está disponible con filtros desde su
          pantalla. Límite: 10,000 registros por reporte.
        </p>
        <div className="form-actions">
          <button
            className="secondary-button"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate('shipments')}
          >
            Exportar envíos
          </button>
          <button
            className="secondary-button"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate('inventory')}
          >
            Exportar inventario
          </button>
        </div>
        {mutation.isError && (
          <p className="form-error" role="alert">
            {mutation.error.message}
          </p>
        )}
        {mutation.isSuccess && (
          <p role="status">Archivo preparado para descargar.</p>
        )}
      </section>
    </>
  );
}
