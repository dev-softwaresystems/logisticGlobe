import type {
  Page,
  RoutePlanView,
  RouteIncidentView,
  RoutingRequest,
} from '@logistics-globe/shared';
import { http } from '../../../services/http';
export const routePlans = async (page: number) =>
  (
    await http.get<Page<RoutePlanView>>('/routing/plans', {
      params: { page, pageSize: 20 },
    })
  ).data;
export const routeIncidents = async (page: number) =>
  (
    await http.get<Page<RouteIncidentView>>('/routing/incidents', {
      params: { page, pageSize: 20 },
    })
  ).data;
export const assignPlan = async (
  input: RoutingRequest & {
    requestId: string;
    vehicleId: string;
    shipmentIds: string[];
    corridorMeters: number;
    confirmSeconds: number;
    confirmObservations: number;
    stopSeconds: number;
    stopRadiusMeters: number;
    maxGapSeconds: number;
    maxAccuracyMeters: number;
    authorizedStops: {
      latitude: number;
      longitude: number;
      radiusMeters: number;
    }[];
  },
) => (await http.post<RoutePlanView>('/routing/plans', input)).data;
export const acknowledgeIncident = async (input: {
  id: string;
  expectedLastObservedAt: string;
  note: string;
}) =>
  (
    await http.post('/routing/incidents/' + input.id + '/acknowledge', {
      expectedLastObservedAt: input.expectedLastObservedAt,
      note: input.note,
    })
  ).data;
