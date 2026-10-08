export interface InventoryAlertSummary {
  id: string;
  sku: string;
  name: string;
  warehouse: string;
  quantity: number;
  minimumQuantity: number;
  createdAt: string;
}
export interface DashboardSummary {
  includesDemonstrationData?: boolean;
  dailyActiveComparison?: DailyActiveComparison;
  shipmentPeriodComparison?: {
    currentCreated: number;
    previousCreated: number;
    currentFrom: string;
    previousFrom: string;
    to: string;
  } | null;
  activeShipments: number;
  warehouseCapacityPercent: number | null;
  availableVehicles: number;
  vehiclesInMaintenance: number;
  pendingDeliveries: number;
  highPriorityDeliveries: number;
  inventoryAlerts: InventoryAlertSummary[];
  generatedAt: string;
}
export type ServiceName = 'api' | 'postgresql' | 'mongodb' | 'redis';
export interface ServiceHealth {
  name: ServiceName;
  status: 'up' | 'down';
  latencyMs: number | null;
}
export interface ServicesHealth {
  status: 'up' | 'degraded';
  services: ServiceHealth[];
  checkedAt: string;
}
export type RoleName =
  | 'ADMIN'
  | 'LOGISTICS_ADMIN'
  | 'FLEET_SUPERVISOR'
  | 'TRAFFIC_COORDINATOR'
  | 'WAREHOUSE_MANAGER'
  | 'VIEWER';
export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  roles: RoleName[];
}
export interface LoginResponse {
  accessToken: string;
  user: CurrentUser;
}

export interface DailyActiveComparison {
  metric: 'activeShipments';
  basis: 'observed-minute-snapshot';
  timeZone: string;
  currentCut: string;
  previousCut: string | null;
  current: number;
  previous: number | null;
  difference: number | null;
  percent: number | null;
  currentObservedAt: string;
  previousObservedAt: string | null;
  reason: string | null;
}
