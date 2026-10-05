import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { inventoryAlerts } from '../../inventory/api/inventory';
import { Pagination } from '../../../components/ui/pagination';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../components/ui/query-state';
export function AlertsPage() {
  const [state, setState] = useState<'open' | 'resolved' | 'all'>('open');
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['alerts', state, page],
    queryFn: () => inventoryAlerts(state, page),
    refetchInterval: 30000,
  });
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">PREVENCIÓN OPERATIVA</p>
          <h1>Alertas de inventario</h1>
          <p className="muted">
            Se abren por debajo del mínimo y se resuelven al reponer stock.
          </p>
        </div>
        <Link className="secondary-button" to="/inventory">
          Gestionar existencias
        </Link>
      </div>
      <div className="filters">
        <label>
          Estado
          <select
            value={state}
            onChange={(e) => {
              setState(e.target.value as typeof state);
              setPage(1);
            }}
          >
            <option value="open">Abiertas</option>
            <option value="resolved">Resueltas</option>
            <option value="all">Todas</option>
          </select>
        </label>
      </div>
      {query.isPending ? (
        <LoadingState message="Consultando alertas…" />
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
              title="Sin alertas para este estado"
              description="Las alertas se generan automáticamente al registrar o ajustar existencias."
            />
          ) : (
            <div className="table-scroll">
              <table>
                <caption className="sr-only">Alertas de inventario</caption>
                <thead>
                  <tr>
                    <th>Artículo</th>
                    <th>Almacén</th>
                    <th>Existencia actual</th>
                    <th>Mínimo actual</th>
                    <th>Estado</th>
                    <th>Creada</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.items.map((alert) => (
                    <tr key={alert.id}>
                      <td>
                        <strong>{alert.item.name}</strong>
                        <small>{alert.item.sku}</small>
                      </td>
                      <td>{alert.item.warehouse.name}</td>
                      <td>{alert.item.quantity}</td>
                      <td>{alert.item.minimumQuantity}</td>
                      <td>
                        {alert.resolvedAt ? (
                          'Resuelta'
                        ) : (
                          <span className="critical-badge">Abierta</span>
                        )}
                      </td>
                      <td>
                        {new Date(alert.createdAt).toLocaleString('es-MX')}
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
    </>
  );
}
