import {
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { shipmentWhere } from '../../shipments/shipments.service.js';
import type { ShipmentQuery } from '../../shipments/shipments.dto.js';
import { csv } from './csv.js';
const MAX_EXPORT_ROWS = 10000;
@Injectable()
export class ReportsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  async shipments(query: ShipmentQuery) {
    const rows = await this.prisma.shipment.findMany({
      where: shipmentWhere(query),
      take: MAX_EXPORT_ROWS + 1,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      include: { vehicle: { select: { plate: true } } },
    });
    if (rows.length > MAX_EXPORT_ROWS)
      throw new UnprocessableEntityException(
        'Narrow the report filters to at most 10000 records',
      );
    return csv(
      [
        'Referencia',
        'Estado',
        'Prioridad',
        'Origen',
        'Destino',
        'Vehículo',
        'Creado UTC',
        'Actualizado UTC',
      ],
      rows.map((row) => [
        row.reference,
        row.status,
        row.priority,
        row.origin,
        row.destination,
        row.vehicle?.plate,
        row.createdAt.toISOString(),
        row.updatedAt.toISOString(),
      ]),
    );
  }
  async inventory() {
    const rows = await this.prisma.inventoryItem.findMany({
      take: MAX_EXPORT_ROWS + 1,
      orderBy: { id: 'asc' },
      include: { threshold: true, warehouse: { select: { name: true } } },
    });
    if (rows.length > MAX_EXPORT_ROWS)
      throw new UnprocessableEntityException(
        'Inventory exceeds the synchronous export limit',
      );
    return csv(
      ['SKU', 'Artículo', 'Almacén', 'Existencia', 'Mínimo', 'Actualizado UTC'],
      rows.map((row) => [
        row.sku,
        row.name,
        row.warehouse.name,
        row.quantity,
        row.threshold?.minimumQuantity,
        row.updatedAt.toISOString(),
      ]),
    );
  }
}
