import type {
  Page,
  InventoryItem,
  InventoryAlert,
  InventoryMovement,
  Warehouse,
} from '@logistics-globe/shared';
import { http } from '../../../services/http';
export async function listInventory(params: {
  page: number;
  search?: string;
  warehouseId?: string;
}): Promise<Page<InventoryItem>> {
  return (await http.get<Page<InventoryItem>>('/inventory', { params })).data;
}
export async function inventoryAlerts(
  state: 'open' | 'resolved' | 'all' = 'open',
  page = 1,
): Promise<Page<InventoryAlert>> {
  return (
    await http.get<Page<InventoryAlert>>('/inventory/alerts', {
      params: { state, page },
    })
  ).data;
}
export async function listWarehouses(): Promise<Page<Warehouse>> {
  return (
    await http.get<Page<Warehouse>>('/inventory/warehouses', {
      params: { pageSize: 100 },
    })
  ).data;
}
export async function createWarehouse(data: {
  code: string;
  name: string;
  capacityUnits: number;
}): Promise<Warehouse> {
  return (await http.post<Warehouse>('/inventory/warehouses', data)).data;
}
export async function createItem(data: {
  warehouseId: string;
  sku: string;
  name: string;
  quantity: number;
  minimumQuantity: number;
}): Promise<InventoryItem> {
  return (await http.post<InventoryItem>('/inventory', data)).data;
}
export async function adjustItem(data: {
  id: string;
  quantity: number;
  minimumQuantity: number;
  reason: string;
  expectedUpdatedAt: string;
}): Promise<InventoryItem> {
  const { id, ...body } = data;
  return (await http.patch<InventoryItem>('/inventory/' + id, body)).data;
}
export async function inventoryMovements(
  id: string,
  page = 1,
): Promise<Page<InventoryMovement>> {
  return (
    await http.get<Page<InventoryMovement>>('/inventory/' + id + '/movements', {
      params: { page },
    })
  ).data;
}
