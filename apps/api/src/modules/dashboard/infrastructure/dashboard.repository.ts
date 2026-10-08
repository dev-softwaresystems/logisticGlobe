import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '../../../generated/prisma/client.js';
import { serializable } from '../../../common/transaction.js';
import type { DashboardSummary } from '@logistics-globe/shared';
import type { RuntimeEnvironment } from '../../../config/environment.js';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import { warehouseCapacityPercent } from '../domain/warehouse-capacity.js';
import { dailyCuts, dailyComparison } from '../domain/daily-comparison.js';
export abstract class DashboardRepository {
  abstract summary(): Promise<DashboardSummary>;
}
export async function readDashboard(
  tx: Prisma.TransactionClient,
  now: Date,
  timeZone: string,
  capture = false,
): Promise<DashboardSummary> {
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
  ] = await Promise.all([
    tx.shipment.count({ where: { status: 'IN_TRANSIT' } }),
    tx.warehouse.aggregate({ _sum: { capacityUnits: true } }),
    tx.inventoryItem.aggregate({ _sum: { quantity: true } }),
    tx.vehicle.count({ where: { status: 'AVAILABLE' } }),
    tx.vehicle.count({ where: { status: 'MAINTENANCE' } }),
    tx.shipment.count({ where: { status: pending } }),
    tx.shipment.count({
      where: { status: pending, priority: 'HIGH' },
    }),
    tx.inventoryAlert.findMany({
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
    tx.shipment.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    }),
    tx.shipment.count({
      where: { createdAt: { gte: currentFrom, lte: now } },
    }),
    tx.shipment.count({
      where: { createdAt: { gte: previousFrom, lt: currentFrom } },
    }),
  ]);
  const demoShipments = await tx.shipment.count({
    where: { reference: { startsWith: 'LGD-V1-' } },
  });
  const cuts = dailyCuts(now, timeZone);
  if (capture)
    await tx.$executeRaw`INSERT INTO "DashboardSnapshot" ("id","timeZone","cutAt","observedAt","active") VALUES (${randomUUID()},${timeZone},${cuts.current},${now},${activeShipments}) ON CONFLICT ("timeZone","cutAt") DO NOTHING`;
  const snapshot = await tx.dashboardSnapshot.findUnique({
    where: { timeZone_cutAt: { timeZone, cutAt: cuts.current } },
  });
  const previous = cuts.previous
    ? await tx.dashboardSnapshot.findUnique({
        where: { timeZone_cutAt: { timeZone, cutAt: cuts.previous } },
      })
    : null;
  const comparison = dailyComparison(
    snapshot ?? { active: activeShipments, observedAt: now },
    previous,
    cuts,
  );
  return {
    includesDemonstrationData: demoShipments > 0,
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
    dailyActiveComparison: comparison,
    generatedAt: now.toISOString(),
  };
}
@Injectable()
export class PrismaDashboardRepository extends DashboardRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService)
    private readonly config: ConfigService<RuntimeEnvironment, true>,
  ) {
    super();
  }
  async summary(): Promise<DashboardSummary> {
    return serializable(this.prisma, (tx) =>
      readDashboard(
        tx,
        new Date(),
        this.config.get('OPERATION_TIME_ZONE', { infer: true }),
        true,
      ),
    );
  }
}
