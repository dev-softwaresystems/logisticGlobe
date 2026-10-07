export type ShipmentStatus =
  'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
export type ShipmentPriority = 'NORMAL' | 'HIGH';
export type VehicleStatus = 'AVAILABLE' | 'ON_ROUTE' | 'MAINTENANCE';
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
export interface Shipment {
  id: string;
  reference: string;
  status: ShipmentStatus;
  priority: ShipmentPriority;
  origin: string;
  destination: string;
  vehicleId: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface ShipmentDetail extends Shipment {
  history: { id: string; status: ShipmentStatus; occurredAt: string }[];
  vehicle: { id: string; plate: string } | null;
}
export interface CreateShipment {
  reference: string;
  origin: string;
  destination: string;
  priority: ShipmentPriority;
  vehicleId?: string;
}
export interface Position {
  accuracyMeters?: number;
  id: string;
  vehicleId: string;
  latitude: number;
  longitude: number;
  observedAt: string;
  receivedAt: string;
}
export interface Vehicle {
  id: string;
  plate: string;
  status: VehicleStatus;
  createdAt: string;
  updatedAt: string;
  position: Position | null;
}
export interface Warehouse {
  id: string;
  code: string;
  name: string;
  capacityUnits: number;
  createdAt: string;
  updatedAt: string;
}
export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  minimumQuantity: number | null;
  warehouseId: string;
  warehouse: { id: string; name: string };
  updatedAt: string;
}
export interface InventoryAlert {
  id: string;
  item: InventoryItem;
  createdAt: string;
  resolvedAt: string | null;
}
export interface InventoryMovement {
  id: string;
  previousQuantity: number;
  quantity: number;
  reason: string;
  createdAt: string;
}
export interface ShipmentFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: ShipmentStatus;
  priority?: ShipmentPriority;
  from?: string;
  to?: string;
}
export interface FleetPage extends Page<Vehicle> {
  telemetryStatus?: 'up' | 'degraded';
}
