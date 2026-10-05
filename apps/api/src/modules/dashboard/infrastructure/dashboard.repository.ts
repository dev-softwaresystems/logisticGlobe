import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import type { DashboardSummary } from '@logistics-globe/shared';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import { warehouseCapacityPercent } from '../domain/warehouse-capacity.js';
export abstract class DashboardRepository {
  abstract summary(): Promise<DashboardSummary>;
}
@Injectable()
export class PrismaDashboardRepository extends DashboardRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {
    super();
  }
  async summary(): Promise<DashboardSummary> {
    const now = new Date();
    const currentFrom = new Date(now.getTime() - 7 * 86400000);
    const previousFrom = new Date(now.getTime() - 14 * 86400000);
    const pending = {
      in: ['PENDING', 'IN_TRANSIT'] as ('PENDING' | 'IN_TRANSIT')[],
    };
    const [
      activeShipments,
      warehouses,
      items,
      availableVehicles,
      vehiclesInMaintenance,
      pendingDeliveries,
      highPriorityDeliveries,
      alerts,
      oldestShipment,
      currentCreated,
      previousCreated,
    ] = await this.prisma.$transaction(
      [
        this.prisma.shipment.count({ where: { status: 'IN_TRANSIT' } }),
        this.prisma.warehouse.aggregate({ _sum: { capacityUnits: true } }),
        this.prisma.inventoryItem.aggregate({ _sum: { quantity: true } }),
        this.prisma.vehicle.count({ where: { status: 'AVAILABLE' } }),
        this.prisma.vehicle.count({ where: { status: 'MAINTENANCE' } }),
        this.prisma.shipment.count({ where: { status: pending } }),
        this.prisma.shipment.count({
          where: { status: pending, priority: 'HIGH' },
        }),
        this.prisma.inventoryAlert.findMany({
          where: { resolvedAt: null },
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            item: {
              include: {
                threshold: true,
                warehouse: { select: { name: true } },
              },
            },
          },
        }),
        this.prisma.shipment.findFirst({
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true },
        }),
        this.prisma.shipment.count({
          where: { createdAt: { gte: currentFrom, lte: now } },
        }),
        this.prisma.shipment.count({
          where: { createdAt: { gte: previousFrom, lt: currentFrom } },
        }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return {
      shipmentPeriodComparison:
        oldestShipment && oldestShipment.createdAt <= previousFrom
          ? {
              currentCreated,
              previousCreated,
              currentFrom: currentFrom.toISOString(),
              previousFrom: previousFrom.toISOString(),
              to: now.toISOString(),
            }
          : null,
      activeShipments,
      warehouseCapacityPercent: warehouseCapacityPercent(
        items._sum.quantity ?? 0,
        warehouses._sum.capacityUnits ?? 0,
      ),
      availableVehicles,
      vehiclesInMaintenance,
      pendingDeliveries,
      highPriorityDeliveries,
      inventoryAlerts: alerts.map((alert) => ({
        id: alert.id,
        sku: alert.item.sku,
        name: alert.item.name,
        warehouse: alert.item.warehouse.name,
        quantity: alert.item.quantity,
        minimumQuantity: alert.item.threshold?.minimumQuantity ?? 0,
        createdAt: alert.createdAt.toISOString(),
      })),
      generatedAt: new Date().toISOString(),
    };
  }
}
