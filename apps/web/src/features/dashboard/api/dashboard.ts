import type { DashboardSummary } from '@logistics-globe/shared';
import { http } from '../../../services/http';
export async function getDashboardSummary(): Promise<DashboardSummary> {
  return (await http.get<DashboardSummary>('/dashboard/summary')).data;
}
