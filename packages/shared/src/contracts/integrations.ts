export interface RoutingRequest {
  origin: { latitude: number; longitude: number };
  destination: { latitude: number; longitude: number };
}
export interface RoutingResult {
  provider: 'osrm';
  distanceMeters: number;
  durationSeconds: number;
  coordinates: [number, number][];
  cached: boolean;
  calculatedAt: string;
}
export interface IntegrationStatus {
  gpsConfigured: boolean;
  routingConfigured: boolean;
}
