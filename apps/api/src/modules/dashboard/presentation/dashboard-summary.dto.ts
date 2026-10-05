import { ApiProperty } from '@nestjs/swagger';
import type {
  DashboardSummary,
  InventoryAlertSummary,
} from '@logistics-globe/shared';
export class InventoryAlertSummaryDto implements InventoryAlertSummary {
  @ApiProperty() id!: string;
  @ApiProperty() sku!: string;
  @ApiProperty() name!: string;
  @ApiProperty() warehouse!: string;
  @ApiProperty() quantity!: number;
  @ApiProperty() minimumQuantity!: number;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}
export class ShipmentPeriodComparisonDto {
  @ApiProperty() currentCreated!: number;
  @ApiProperty() previousCreated!: number;
  @ApiProperty({ format: 'date-time' }) currentFrom!: string;
  @ApiProperty({ format: 'date-time' }) previousFrom!: string;
  @ApiProperty({ format: 'date-time' }) to!: string;
}
export class DashboardSummaryDto implements DashboardSummary {
  @ApiProperty({ type: ShipmentPeriodComparisonDto, nullable: true })
  shipmentPeriodComparison?: ShipmentPeriodComparisonDto | null;
  @ApiProperty({ description: 'Shipments in transit' })
  activeShipments!: number;
  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Occupied units / capacity; null without capacity data',
  })
  warehouseCapacityPercent!: number | null;
  @ApiProperty() availableVehicles!: number;
  @ApiProperty() vehiclesInMaintenance!: number;
  @ApiProperty({ description: 'Pending and in-transit shipments' })
  pendingDeliveries!: number;
  @ApiProperty() highPriorityDeliveries!: number;
  @ApiProperty({ type: [InventoryAlertSummaryDto] })
  inventoryAlerts!: InventoryAlertSummaryDto[];
  @ApiProperty({ format: 'date-time' }) generatedAt!: string;
}
