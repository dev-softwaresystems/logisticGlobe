import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../infrastructure/database/prisma.service.js';
import { serializable } from '../common/transaction.js';
import { recordEvent } from '../infrastructure/messaging/outbox.js';
import { assertTransition } from './domain/transitions.js';
import type {
  ShipmentQuery,
  CreateShipmentDto,
  ChangeShipmentDto,
} from './shipments.dto.js';
export function shipmentWhere(query: ShipmentQuery): Prisma.ShipmentWhereInput {
  if (query.from && query.to && new Date(query.from) > new Date(query.to))
    throw new BadRequestException('Invalid date interval');
  return {
    status: query.status,
    priority: query.priority,
    createdAt:
      query.from || query.to ? { gte: query.from, lte: query.to } : undefined,
    ...(query.search
      ? {
          OR: ['reference', 'origin', 'destination'].map((field) => ({
            [field]: { contains: query.search, mode: 'insensitive' },
          })),
        }
      : {}),
  };
}
@Injectable()
export class ShipmentsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  async list(query: ShipmentQuery) {
    const where = shipmentWhere(query);
    const [items, total] = await this.prisma.$transaction(
      [
        this.prisma.shipment.findMany({
          where,
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        }),
        this.prisma.shipment.count({ where }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    return { items, total, page: query.page, pageSize: query.pageSize };
  }
  async detail(id: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id },
      include: {
        history: {
          orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
          select: { id: true, status: true, occurredAt: true },
        },
        vehicle: { select: { id: true, plate: true } },
      },
    });
    if (!shipment) throw new NotFoundException('Shipment not found');
    return shipment;
  }
  private async existing(dto: CreateShipmentDto) {
    const existing = await this.prisma.shipment.findUnique({
      where: { reference: dto.reference },
    });
    if (!existing) return null;
    if (
      existing.origin !== dto.origin ||
      existing.destination !== dto.destination ||
      existing.priority !== dto.priority ||
      existing.vehicleId !== (dto.vehicleId ?? null)
    )
      throw new ConflictException(
        'Reference already used by a different shipment',
      );
    return existing;
  }
  async create(dto: CreateShipmentDto, actorId: string) {
    const existing = await this.existing(dto);
    if (existing) return existing;
    try {
      return await serializable(this.prisma, async (tx) => {
        if (dto.vehicleId) {
          const vehicle = await tx.vehicle.findUnique({
            where: { id: dto.vehicleId },
          });
          if (!vehicle) throw new NotFoundException('Vehicle not found');
          if (vehicle.status === 'MAINTENANCE')
            throw new ConflictException('Vehicle is in maintenance');
        }
        const shipment = await tx.shipment.create({
          data: {
            reference: dto.reference,
            origin: dto.origin,
            destination: dto.destination,
            priority: dto.priority,
            vehicleId: dto.vehicleId,
            history: { create: { status: 'PENDING', actorId } },
          },
        });
        await recordEvent(
          tx,
          'shipment.status.updated',
          {
            shipmentId: shipment.id,
            status: shipment.status,
            occurredAt: shipment.createdAt.toISOString(),
          },
          actorId,
        );
        return shipment;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const repeated = await this.existing(dto);
        if (repeated) return repeated;
      }
      throw error;
    }
  }
  async change(id: string, dto: ChangeShipmentDto, actorId: string) {
    return serializable(this.prisma, async (tx) => {
      const current = await tx.shipment.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('Shipment not found');
      if (
        current.updatedAt.toISOString() !==
        new Date(dto.expectedUpdatedAt).toISOString()
      )
        throw new ConflictException('Shipment changed. Reload before editing.');
      assertTransition(current.status, dto.status);
      const vehicleId = dto.vehicleId ?? current.vehicleId;
      if (dto.status === 'IN_TRANSIT') {
        if (!vehicleId)
          throw new BadRequestException(
            'A vehicle is required to start transit',
          );
        const vehicle = await tx.vehicle.findUnique({
          where: { id: vehicleId },
        });
        if (!vehicle) throw new NotFoundException('Vehicle not found');
        if (vehicle.status === 'MAINTENANCE')
          throw new ConflictException('Vehicle is in maintenance');
        await tx.vehicle.update({
          where: { id: vehicleId },
          data: { status: 'ON_ROUTE' },
        });
        await recordEvent(
          tx,
          'fleet.vehicle.updated',
          {
            vehicleId,
            status: 'ON_ROUTE',
          },
          actorId,
        );
      } else if (dto.vehicleId && dto.vehicleId !== current.vehicleId)
        throw new BadRequestException(
          'Assignment can only change when transit starts',
        );
      const shipment = await tx.shipment.update({
        where: { id },
        data: {
          status: dto.status,
          vehicleId,
          history: { create: { status: dto.status, actorId } },
        },
      });
      if (
        current.vehicleId &&
        current.status === 'IN_TRANSIT' &&
        (await tx.shipment.count({
          where: { vehicleId: current.vehicleId, status: 'IN_TRANSIT' },
        })) === 0
      ) {
        await tx.vehicle.update({
          where: { id: current.vehicleId },
          data: { status: 'AVAILABLE' },
        });
        await recordEvent(
          tx,
          'fleet.vehicle.updated',
          {
            vehicleId: current.vehicleId,
            status: 'AVAILABLE',
          },
          actorId,
        );
      }
      await recordEvent(
        tx,
        'shipment.status.updated',
        {
          shipmentId: id,
          status: dto.status,
          occurredAt: shipment.updatedAt.toISOString(),
        },
        actorId,
      );
      return shipment;
    });
  }
}
