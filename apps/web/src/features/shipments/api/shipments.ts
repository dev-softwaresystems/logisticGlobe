import type {
  CreateShipment,
  Page,
  Shipment,
  ShipmentDetail,
  ShipmentFilters,
  ShipmentStatus,
} from '@logistics-globe/shared';
import { http } from '../../../services/http';
export async function listShipments(
  params: ShipmentFilters,
): Promise<Page<Shipment>> {
  return (await http.get<Page<Shipment>>('/shipments', { params })).data;
}
export async function shipmentDetail(id: string): Promise<ShipmentDetail> {
  return (await http.get<ShipmentDetail>('/shipments/' + id)).data;
}
export async function createShipment(data: CreateShipment): Promise<Shipment> {
  return (await http.post<Shipment>('/shipments', data)).data;
}
export async function changeShipment(data: {
  id: string;
  status: ShipmentStatus;
  expectedUpdatedAt: string;
  vehicleId?: string;
}): Promise<Shipment> {
  const { id, ...body } = data;
  return (await http.patch<Shipment>('/shipments/' + id + '/status', body))
    .data;
}
