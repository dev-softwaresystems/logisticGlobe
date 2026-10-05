import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, it, expect, vi } from 'vitest';
import type { InventoryItem } from '@logistics-globe/shared';
import { StockForm } from './inventory-forms';
import { adjustItem, listWarehouses } from '../api/inventory';
vi.mock('../api/inventory');
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it('keeps the original edit version when server state changes while the user is entering an adjustment', async () => {
  vi.mocked(listWarehouses).mockResolvedValue({
    items: [],
    total: 0,
    page: 1,
    pageSize: 100,
  });
  const item: InventoryItem = {
    id: 'item',
    sku: 'TEST',
    name: 'Artículo',
    quantity: 5,
    minimumQuantity: 10,
    warehouseId: 'warehouse',
    warehouse: { id: 'warehouse', name: 'Almacén' },
    updatedAt: '2026-10-04T12:00:00.000Z',
  };
  vi.mocked(adjustItem).mockResolvedValue({ ...item, quantity: 20 });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const done = vi.fn();
  const view = render(
    <QueryClientProvider client={client}>
      <StockForm item={item} onDone={done} />
    </QueryClientProvider>,
  );
  fireEvent.change(screen.getByLabelText('Existencia en unidades'), {
    target: { value: '20' },
  });
  fireEvent.change(screen.getByLabelText('Motivo del ajuste'), {
    target: { value: 'Reposición de prueba' },
  });
  view.rerender(
    <QueryClientProvider client={client}>
      <StockForm
        item={{ ...item, updatedAt: '2026-10-04T12:01:00.000Z', quantity: 8 }}
        onDone={done}
      />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Guardar existencias' }));
  await waitFor(() =>
    expect(adjustItem).toHaveBeenCalledWith({
      id: 'item',
      quantity: 20,
      minimumQuantity: 10,
      reason: 'Reposición de prueba',
      expectedUpdatedAt: item.updatedAt,
    }),
  );
  await waitFor(() => expect(done).toHaveBeenCalled());
});
