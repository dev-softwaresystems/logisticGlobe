import { useMutation, useQueryClient } from '@tanstack/react-query';
import { importReferenceCsv } from '../api/integration';
import { usePermission } from '../../auth/hooks/use-permissions';
export function ReferenceImport() {
  const client = useQueryClient(),
    canInventory = usePermission([
      'ADMIN',
      'LOGISTICS_ADMIN',
      'WAREHOUSE_MANAGER',
    ]);
  const mutation = useMutation({
    mutationFn: importReferenceCsv,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['inventory'] });
      void client.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
  if (!canInventory) return null;
  return (
    <section className="panel operation-form">
      <h2>Intercambio de stock de referencia</h2>
      <p>
        Modo local. No acredita compatibilidad con el ERP/WMS del cliente. Se
        exige versión actual de cada artículo; no crea SKU ni almacenes.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate(String(new FormData(event.currentTarget).get('csv')));
        }}
      >
        <label>
          CSV validado (máximo 100 registros)
          <textarea
            name="csv"
            rows={6}
            maxLength={95000}
            required
            placeholder="externalId,version,observedAt,warehouseCode,sku,quantity,minimumQuantity,expectedUpdatedAt"
          />
        </label>
        <button className="secondary-button" disabled={mutation.isPending}>
          Importar stock de referencia
        </button>
      </form>
      {mutation.isError && <p role="alert">{mutation.error.message}</p>}
      {mutation.data && (
        <div className="table-scroll">
          <table>
            <caption>Resultados por registro · referencia local</caption>
            <thead>
              <tr>
                <th>Identificador externo</th>
                <th>Resultado</th>
                <th>Conciliación</th>
              </tr>
            </thead>
            <tbody>
              {mutation.data.results.map((r, i) => (
                <tr key={i}>
                  <td>{r.externalId}</td>
                  <td>{r.status}</td>
                  <td>{r.reason ?? r.receiptId ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
