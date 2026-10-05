import { ConflictException } from '@nestjs/common';
import type { ShipmentStatus } from '@logistics-globe/shared';
const transitions: Record<ShipmentStatus, ShipmentStatus[]> = {
  PENDING: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};
export function assertTransition(
  from: ShipmentStatus,
  to: ShipmentStatus,
): void {
  if (!transitions[from].includes(to))
    throw new ConflictException('Invalid shipment status transition');
}
