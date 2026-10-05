import type {
  IntegrationStatus,
  RoutingRequest,
  RoutingResult,
} from '@logistics-globe/shared';
import { http } from '../../../services/http';
export const integrationStatus = async () =>
  (await http.get<IntegrationStatus>('/integrations/status')).data;
export const calculateRoute = async (input: RoutingRequest) =>
  (await http.post<RoutingResult>('/routing/route', input)).data;
