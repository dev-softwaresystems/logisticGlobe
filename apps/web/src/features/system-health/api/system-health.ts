import type { ServicesHealth } from '@logistics-globe/shared';
import { http } from '../../../services/http';
export async function getServicesHealth(): Promise<ServicesHealth> {
  return (await http.get<ServicesHealth>('/health/services')).data;
}
