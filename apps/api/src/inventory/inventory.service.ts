import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../infrastructure/database/prisma.service.js';
import { recordEvent } from '../infrastructure/messaging/outbox.js';
import { serializable } from '../common/transaction.js';
import type {
  AdjustItemDto,
  CreateItemDto,
  CreateWarehouseDto,
  InventoryQuery,
} from './inventory.dto.js';
import type { PaginationDto } from '../common/pagination.dto.js';
const include = {
  warehouse: { select: { id: true, name: true } },
  threshold: true,
} as const;
function itemView(
  item: Prisma.InventoryItemGetPayload<{ include: typeof include }>,
) {
  return {
    id: item.id,
    sku: item.sku,
    name: item.name,
    quantity: item.quantity,
    warehouseId: item.warehouseId,
    warehouse: item.warehouse,
    minimumQuantity: item.threshold?.minimumQuantity ?? null,
    updatedAt: item.updatedAt,
  };
}
@Injectable()
export class InventoryService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  private where(query: InventoryQuery): Prisma.InventoryItemWhereInput {
    return {
      warehouseId: query.warehouseId,
      ...(query.search
        ? {
            OR: [
              { sku: { contains: query.search, mode: 'insensitive' } },
              { name: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }
  async list(query: InventoryQuery) {
    const where = this.where(query);
    const [items, total] = await this.prisma.$transaction(
      [
        this.prisma.inventoryItem.findMany({
          where,
          include,
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
          orderBy: { id: 'asc' },
        }),
        this.prisma.inventoryItem.count({ where }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    return {
      items: items.map(itemView),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
  async alerts(query: InventoryQuery) {
    const where: Prisma.InventoryAlertWhereInput = {
      item: this.where(query),
      ...(query.state === 'all'
        ? {}
        : { resolvedAt: query.state === 'open' ? null : { not: null } }),
    };
    const [items, total] = await this.prisma.$transaction(
      [
        this.prisma.inventoryAlert.findMany({
          where,
          include: { item: { include } },
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
        this.prisma.inventoryAlert.count({ where }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    return {
      items: items.map((alert) => ({
        id: alert.id,
        createdAt: alert.createdAt,
        resolvedAt: alert.resolvedAt,
        item: itemView(alert.item),
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
  async warehouses(query: PaginationDto) {
    const where = query.search
      ? { name: { contains: query.search, mode: 'insensitive' as const } }
      : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.warehouse.findMany({
        where,
        orderBy: { code: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.warehouse.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }
  async createWarehouse(dto: CreateWarehouseDto, actorId: string) {
    try {
      return await serializable(this.prisma, async (tx) => {
        const warehouse = await tx.warehouse.create({
          data: {
            code: dto.code,
            name: dto.name,
            capacityUnits: dto.capacityUnits,
          },
        });
        await recordEvent(
          tx,
          'inventory.warehouse.updated',
          { warehouseId: warehouse.id },
          actorId,
        );
        return warehouse;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException('Warehouse code already exists');
      throw error;
    }
  }
  private async evaluate(
    tx: Prisma.TransactionClient,
    itemId: string,
    quantity: number,
    minimumQuantity: number,
    actorId: string,
  ) {
    const open = await tx.inventoryAlert.findFirst({
      where: { itemId, resolvedAt: null },
    });
    if (quantity < minimumQuantity && !open) {
      await tx.inventoryAlert.create({ data: { itemId } });
      await recordEvent(
        tx,
        'inventory.threshold.breached',
        {
          itemId,
          quantity,
          minimumQuantity,
        },
        actorId,
      );
    } else if (quantity >= minimumQuantity)
      await tx.inventoryAlert.updateMany({
        where: { itemId, resolvedAt: null },
        data: { resolvedAt: new Date() },
      });
    await recordEvent(tx, 'inventory.updated', { itemId }, actorId);
  }
  async create(dto: CreateItemDto, actorId: string) {
    try {
      return await serializable(this.prisma, async (tx) => {
        if (
          !(await tx.warehouse.findUnique({ where: { id: dto.warehouseId } }))
        )
          throw new NotFoundException('Warehouse not found');
        const { minimumQuantity, ...data } = dto;
        const item = await tx.inventoryItem.create({
          data: { ...data, threshold: { create: { minimumQuantity } } },
          include,
        });
        await tx.inventoryMovement.create({
          data: {
            itemId: item.id,
            actorId,
            previousQuantity: 0,
            quantity: item.quantity,
            reason: 'Initial stock',
          },
        });
        await this.evaluate(
          tx,
          item.id,
          item.quantity,
          minimumQuantity,
          actorId,
        );
        return itemView(item);
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException('SKU already exists in this warehouse');
      throw error;
    }
  }
  async adjust(id: string, dto: AdjustItemDto, actorId: string) {
    return serializable(this.prisma, async (tx) => {
      const item = await tx.inventoryItem.findUnique({ where: { id } });
      if (!item) throw new NotFoundException('Inventory item not found');
      if (
        item.updatedAt.toISOString() !==
        new Date(dto.expectedUpdatedAt).toISOString()
      )
        throw new ConflictException('Stock changed. Reload before editing.');
      const updated = await tx.inventoryItem.update({
        where: { id },
        data: {
          quantity: dto.quantity,
          threshold: {
            upsert: {
              create: { minimumQuantity: dto.minimumQuantity },
              update: { minimumQuantity: dto.minimumQuantity },
            },
          },
        },
        include,
      });
      await tx.inventoryMovement.create({
        data: {
          itemId: id,
          actorId,
          previousQuantity: item.quantity,
          quantity: dto.quantity,
          reason: dto.reason,
        },
      });
      await this.evaluate(tx, id, dto.quantity, dto.minimumQuantity, actorId);
      return itemView(updated);
    });
  }
  async movements(id: string, query: PaginationDto) {
    if (!(await this.prisma.inventoryItem.findUnique({ where: { id } })))
      throw new NotFoundException('Inventory item not found');
    const where = { itemId: id };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.inventoryMovement.findMany({
        where,
        select: {
          id: true,
          previousQuantity: true,
          quantity: true,
          reason: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: query.pageSize,
        skip: (query.page - 1) * query.pageSize,
      }),
      this.prisma.inventoryMovement.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }
}
