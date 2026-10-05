import type { RoleName } from '@logistics-globe/shared';
export const READ_ROLES: RoleName[] = [
  'ADMIN',
  'LOGISTICS_ADMIN',
  'FLEET_SUPERVISOR',
  'TRAFFIC_COORDINATOR',
  'WAREHOUSE_MANAGER',
  'VIEWER',
];
export const SHIPMENT_WRITE: RoleName[] = [
  'ADMIN',
  'LOGISTICS_ADMIN',
  'TRAFFIC_COORDINATOR',
];
export const FLEET_WRITE: RoleName[] = [
  'ADMIN',
  'LOGISTICS_ADMIN',
  'FLEET_SUPERVISOR',
];
export const INVENTORY_WRITE: RoleName[] = [
  'ADMIN',
  'LOGISTICS_ADMIN',
  'WAREHOUSE_MANAGER',
];
