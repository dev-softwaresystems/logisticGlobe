import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  inventoryMovements,
  listInventory,
  listWarehouses,
} from '../api/inventory';
import { StockForm, WarehouseForm } from '../components/inventory-forms';
import { downloadReport } from '../../reports/api/reports';
import { usePermission } from '../../auth/hooks/use-permissions';
import { Pagination } from '../../../components/ui/pagination';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../components/ui/query-state';
export function InventoryPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newWarehouse, setNewWarehouse] = useState(false);
  const [historyId, setHistoryId] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const query = useQuery({
    queryKey: ['inventory', page, search, warehouseId],
    queryFn: () =>
      listInventory({ page, search, ...(warehouseId ? { warehouseId } : {}) }),
    refetchInterval: 30000,
  });
  const warehouses = useQuery({
    queryKey: ['warehouses'],
    queryFn: listWarehouses,
  });
  const movements = useQuery({
    queryKey: ['movements', historyId, historyPage],
    queryFn: () => inventoryMovements(historyId, historyPage),
    enabled: !!historyId,
  });
  const canWrite = usePermission([
    'ADMIN',
    'LOGISTICS_ADMIN',
    'WAREHOUSE_MANAGER',
  ]);
  const report = useMutation({ mutationFn: () => downloadReport('inventory') });
  const selected = query.data?.items.find((item) => item.id === editing);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">ALMACENES Y EXISTENCIAS</p>
          <h1>Inventario</h1>
          <p className="muted">
            Umbrales y ajustes trazables. Las alertas se calculan al guardar.
          </p>
        </div>
        <div className="form-actions">
          <Link className="secondary-button" to="/alerts">
            Ver alertas
          </Link>
          <button
            className="secondary-button"
            disabled={report.isPending}
            onClick={() => report.mutate()}
          >
            Exportar CSV
          </button>
          {canWrite && (
            <>
              <button
                className="secondary-button"
                onClick={() => setCreating(!creating)}
              >
                Registrar artículo
              </button>
              <button
                className="secondary-button"
                onClick={() => setNewWarehouse(!newWarehouse)}
              >
                Nuevo almacén
              </button>
            </>
          )}
        </div>
      </div>
      {newWarehouse && <WarehouseForm onDone={() => setNewWarehouse(false)} />}
      {creating && <StockForm onDone={() => setCreating(false)} />}
      {selected && (
        <StockForm
          key={selected.id}
          item={selected}
          onDone={() => setEditing(null)}
        />
      )}
      {report.isError && <p role="alert">{report.error.message}</p>}
      <div className="filters">
        <label>
          Buscar artículo
          <input
            maxLength={100}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
              setEditing(null);
            }}
          />
        </label>
        <label>
          Almacén
          <select
            value={warehouseId}
            onChange={(e) => {
              setWarehouseId(e.target.value);
              setPage(1);
              setEditing(null);
            }}
          >
            <option value="">Todos</option>
            {warehouses.data?.items.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {query.isPending ? (
        <LoadingState message="Consultando inventario…" />
      ) : query.isError ? (
        <ErrorState
          message={query.error.message}
          retry={() => {
            void query.refetch();
          }}
        />
      ) : (
        <section className="panel">
          {!query.data.items.length ? (
            <EmptyState
              title="Sin artículos"
              description="Registra artículos o cambia los filtros."
            />
          ) : (
            <div className="table-scroll">
              <table>
                <caption className="sr-only">Existencias por almacén</caption>
                <thead>
                  <tr>
                    <th>Artículo</th>
                    <th>Almacén</th>
                    <th>Existencia</th>
                    <th>Mínimo</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name}</strong>
                        <small>{item.sku}</small>
                      </td>
                      <td>{item.warehouse.name}</td>
                      <td>
                        {item.quantity}
                        {item.minimumQuantity !== null &&
                          item.quantity < item.minimumQuantity && (
                            <small className="critical-badge">Stock bajo</small>
                          )}
                      </td>
                      <td>{item.minimumQuantity ?? 'Sin umbral'}</td>
                      <td>
                        <div className="form-actions">
                          {canWrite && (
                            <button
                              className="secondary-button"
                              onClick={() => setEditing(item.id)}
                            >
                              Ajustar
                            </button>
                          )}
                          <button
                            className="secondary-button"
                            onClick={() => {
                              setHistoryId(item.id);
                              setHistoryPage(1);
                            }}
                          >
                            Historial
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination {...query.data} onPage={setPage} />
        </section>
      )}
      {historyId && (
        <section className="panel operation-form">
          <h2>Historial de ajustes</h2>
          {movements.isPending ? (
            <LoadingState message="Consultando ajustes…" />
          ) : movements.isError ? (
            <ErrorState
              message={movements.error.message}
              retry={() => {
                void movements.refetch();
              }}
            />
          ) : (
            <>
              <ol className="timeline">
                {movements.data.items.map((m) => (
                  <li key={m.id}>
                    <strong>
                      {m.previousQuantity} → {m.quantity}
                    </strong>{' '}
                    · {m.reason} ·{' '}
                    {new Date(m.createdAt).toLocaleString('es-MX')}
                  </li>
                ))}
              </ol>
              {!movements.data.items.length && (
                <EmptyState
                  title="Sin ajustes registrados"
                  description="Los nuevos ajustes quedarán registrados aquí."
                />
              )}
              <Pagination {...movements.data} onPage={setHistoryPage} />
            </>
          )}
        </section>
      )}
    </>
  );
}
