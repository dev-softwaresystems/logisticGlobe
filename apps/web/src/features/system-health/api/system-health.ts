import type { ServicesHealth } from '@logistics-globe/shared';
import { http } from '../../../services/http';
export async function getServicesHealth(): Promise<ServicesHealth> {
  return (await http.get<ServicesHealth>('/health/services')).data;
}

export const operationalHealth = async () =>
  (
    await http.get<import('@logistics-globe/shared').OperationalHealth>(
      '/health/operations',
    )
  ).data;
