import type { DashboardSummary } from './dashboard.js';
export interface OperationalComponent {
  name: 'inventory-module' | 'routing' | 'gps-ingestion' | 'erp-wms-reference';
  status:
    'operational' | 'degraded' | 'unavailable' | 'not-configured' | 'unknown';
  checkedAt: string;
  latencyMs: number | null;
  reason: string;
  critical: boolean;
}
export interface OperationalHealth {
  checkedAt: string;
  components: OperationalComponent[];
}
export interface ExecutiveReport {
  generatedAt: string;
  timeZone: string;
  period: { from: string; to: string };
  filters: { status?: string; priority?: string };
  summary: DashboardSummary;
  states: { name: string; count: number }[];
  priorities: { name: string; count: number }[];
  fleet: { name: string; count: number }[];
  warehouses: { name: string; capacity: number; occupied: number }[];
  alerts: {
    sku: string;
    warehouse: string;
    quantity: number;
    minimum: number;
  }[];
  health: OperationalHealth;
  limitations: string[];
}
export interface RoutePlanView {
  id: string;
  vehicleId: string;
  version: number;
  shipmentIds: string[];
  geometry: [number, number][];
  actorId: string;
  parameters: {
    corridorMeters: number;
    confirmSeconds: number;
    confirmObservations: number;
    stopRadiusMeters: number;
    stopSeconds: number;
    maxGapSeconds: number;
    maxAccuracyMeters: number;
    authorizedStops: {
      latitude: number;
      longitude: number;
      radiusMeters: number;
      reference?: string;
    }[];
  };
  effectiveAt: string;
  retiredAt: string | null;
}
export interface RouteIncidentView {
  id: string;
  planId: string;
  kind: string;
  startedAt: string;
  lastObservedAt: string;
  resolvedAt: string | null;
  acknowledgedAt: string | null;
  plan: { vehicleId: string; version: number };
  history: { action: string; occurredAt: string; note: string | null }[];
}
export interface ReferenceStock {
  externalId: string;
  version: number;
  observedAt: string;
  warehouseCode: string;
  sku: string;
  quantity: number;
  minimumQuantity: number;
  expectedUpdatedAt: string;
}
export interface ImportResult {
  externalId: string;
  status: 'accepted' | 'duplicate' | 'conflict' | 'invalid';
  receiptId?: string;
  reason?: string;
}
