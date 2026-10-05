import type {
  FleetPage,
  Page,
  Position,
  Vehicle,
  VehicleStatus,
} from '@logistics-globe/shared';
import { http } from '../../../services/http';
export async function listVehicles(
  params: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: VehicleStatus;
  } = {},
): Promise<FleetPage> {
  return (await http.get<FleetPage>('/fleet/vehicles', { params })).data;
}
export async function createVehicle(plate: string) {
  return (await http.post('/fleet/vehicles', { plate })).data as Vehicle;
}
export async function changeVehicle(data: {
  id: string;
  status: 'AVAILABLE' | 'MAINTENANCE';
  expectedUpdatedAt: string;
}) {
  const { id, ...body } = data;
  return (await http.patch<Vehicle>('/fleet/vehicles/' + id, body)).data;
}
export async function vehiclePositions(
  id: string,
  page = 1,
): Promise<Page<Position>> {
  return (
    await http.get<Page<Position>>('/fleet/vehicles/' + id + '/positions', {
      params: { page },
    })
  ).data;
}
export async function sendPosition(data: {
  vehicleId: string;
  latitude: number;
  longitude: number;
  observedAt: string;
  id: string;
}): Promise<Position> {
  const { vehicleId, ...body } = data;
  return (
    await http.post<Position>(
      '/fleet/vehicles/' + vehicleId + '/positions',
      body,
    )
  ).data;
}
