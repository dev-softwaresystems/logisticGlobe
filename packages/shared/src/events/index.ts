import type {
  PositionSource,
  ShipmentStatus,
  VehicleStatus,
} from '../contracts/operations.js';
export interface LogisticsEventPayloads {
  'route.plan.updated': { planId: string; vehicleId: string; version: number };
  'route.incident.updated': {
    incidentId: string;
    vehicleId: string;
    kind: string;
    resolved: boolean;
  };
  'fleet.position.updated': {
    source?: PositionSource;
    accuracyMeters?: number;
    speedKph?: number;
    headingDegrees?: number;
    vehicleId: string;
    latitude: number;
    longitude: number;
    observedAt: string;
  };
  'fleet.vehicle.updated': { vehicleId: string; status: VehicleStatus };
  'shipment.status.updated': {
    shipmentId: string;
    status: ShipmentStatus;
    occurredAt: string;
  };
  'inventory.threshold.breached': {
    itemId: string;
    quantity: number;
    minimumQuantity: number;
  };
  'inventory.updated': { itemId: string };
  'inventory.warehouse.updated': { warehouseId: string };
  'system.health.updated': {
    service: string;
    status: 'up' | 'down';
    checkedAt: string;
  };
}
export type LogisticsEventName = keyof LogisticsEventPayloads;
export type LogisticsEvent<K extends LogisticsEventName = LogisticsEventName> =
  {
    [N in K]: {
      id: string;
      name: N;
      occurredAt: string;
      payload: LogisticsEventPayloads[N];
    };
  }[K];
export interface EventBus {
  publish<K extends LogisticsEventName>(
    event: LogisticsEvent<K>,
  ): Promise<void>;
}
export interface ServerEvents {
  event: (event: LogisticsEvent) => void;
}
export interface ClientEvents {}
