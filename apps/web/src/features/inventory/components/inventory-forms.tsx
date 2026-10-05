import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { InventoryItem } from '@logistics-globe/shared';
import {
  adjustItem,
  createItem,
  createWarehouse,
  listWarehouses,
} from '../api/inventory';
import { useOperationsRefresh } from '../../../hooks/use-operations';
export function StockForm({
  item,
  onDone,
}: {
  item?: InventoryItem;
  onDone: () => void;
}) {
  const refresh = useOperationsRefresh();
  const [expectedUpdatedAt] = useState(item?.updatedAt);
  const warehouses = useQuery({
    queryKey: ['warehouses'],
    queryFn: listWarehouses,
  });
  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const quantity = Number(data.get('quantity'));
      const minimumQuantity = Number(data.get('minimumQuantity'));
      if (item)
        return adjustItem({
          id: item.id,
          quantity,
          minimumQuantity,
          reason: String(data.get('reason')),
          expectedUpdatedAt: expectedUpdatedAt!,
        });
      return createItem({
        quantity,
        minimumQuantity,
        warehouseId: String(data.get('warehouseId')),
        sku: String(data.get('sku')),
        name: String(data.get('name')),
      });
    },
    onSuccess: async () => {
      await refresh();
      onDone();
    },
  });
  return (
    <form
      className="operation-form panel"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate(new FormData(e.currentTarget));
      }}
    >
      <h2>{item ? 'Ajustar ' + item.name : 'Registrar artículo'}</h2>
      {!item && (
        <>
          <label>
            Almacén
            <select name="warehouseId" required>
              <option value="">Seleccionar</option>
              {warehouses.data?.items.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            SKU
            <input name="sku" required minLength={2} maxLength={64} />
          </label>
          <label>
            Nombre
            <input name="name" required minLength={2} maxLength={160} />
          </label>
        </>
      )}
      <label>
        Existencia en unidades
        <input
          name="quantity"
          type="number"
          required
          min={0}
          max={1000000000}
          step={1}
          defaultValue={item?.quantity ?? 0}
        />
      </label>
      <label>
        Mínimo de seguridad
        <input
          name="minimumQuantity"
          type="number"
          required
          min={0}
          max={1000000000}
          step={1}
          defaultValue={item?.minimumQuantity ?? 0}
        />
      </label>
      {item && (
        <label>
          Motivo del ajuste
          <input name="reason" required minLength={5} maxLength={240} />
        </label>
      )}
      {warehouses.isError && !item && (
        <p role="alert">{warehouses.error.message}</p>
      )}
      {mutation.isError && (
        <p className="form-error" role="alert">
          {mutation.error.message}
        </p>
      )}
      <div className="form-actions">
        <button className="primary-button" disabled={mutation.isPending}>
          Guardar existencias
        </button>
        <button type="button" className="secondary-button" onClick={onDone}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
export function WarehouseForm({ onDone }: { onDone: () => void }) {
  const refresh = useOperationsRefresh();
  const mutation = useMutation({
    mutationFn: createWarehouse,
    onSuccess: async () => {
      await refresh();
      onDone();
    },
  });
  return (
    <form
      className="operation-form panel"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        mutation.mutate({
          code: String(data.get('code')),
          name: String(data.get('name')),
          capacityUnits: Number(data.get('capacity')),
        });
      }}
    >
      <h2>Registrar almacén</h2>
      <label>
        Código
        <input name="code" required minLength={2} maxLength={50} />
      </label>
      <label>
        Nombre
        <input name="name" required minLength={2} maxLength={120} />
      </label>
      <label>
        Capacidad en unidades
        <input
          name="capacity"
          type="number"
          min={1}
          max={1000000000}
          step={1}
          required
        />
      </label>
      {mutation.isError && (
        <p className="form-error" role="alert">
          {mutation.error.message}
        </p>
      )}
      <div className="form-actions">
        <button className="primary-button" disabled={mutation.isPending}>
          Guardar almacén
        </button>
        <button type="button" className="secondary-button" onClick={onDone}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
