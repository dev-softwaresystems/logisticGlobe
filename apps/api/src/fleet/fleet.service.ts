import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../infrastructure/database/prisma.service.js';
import type { EventBus, PositionSource } from '@logistics-globe/shared';
import { EVENT_BUS } from '../infrastructure/messaging/event-bus.js';
import { recordEvent } from '../infrastructure/messaging/outbox.js';
import { serializable } from '../common/transaction.js';
import { TelemetryRepository } from './infrastructure/telemetry.repository.js';
import { TelemetryReconciler } from './infrastructure/telemetry-reconciler.js';
import type {
  ChangeVehicleDto,
  CreateVehicleDto,
  PositionDto,
  PositionQuery,
  VehicleQuery,
} from './fleet.dto.js';
@Injectable()
export class FleetService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TelemetryRepository)
    private readonly telemetry: TelemetryRepository,
    @Inject(EVENT_BUS) private readonly bus: EventBus,
    @Inject(TelemetryReconciler)
    private readonly reconciler: TelemetryReconciler,
  ) {}
  async list(query: VehicleQuery) {
    const where: Prisma.VehicleWhereInput = {
      status: query.status,
      ...(query.search
        ? { plate: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({
        where,
        include: {
          shipments: {
            where: { status: { in: ['PENDING', 'IN_TRANSIT'] } },
            select: { id: true, reference: true },
          },
        },
        orderBy: { plate: 'asc' },
        take: query.pageSize,
        skip: (query.page - 1) * query.pageSize,
      }),
      this.prisma.vehicle.count({ where }),
    ]);
    let telemetryAvailable = true;
    const withPositions = await Promise.all(
      items.map(async (vehicle) => ({
        ...vehicle,
        assignedShipments: vehicle.shipments,
        shipments: undefined,
        position: await this.telemetry.latest(vehicle.id).catch(() => {
          telemetryAvailable = false;
          return null;
        }),
      })),
    );
    return {
      telemetryStatus: telemetryAvailable ? 'up' : 'degraded',
      items: withPositions,
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
  async detail(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        shipments: {
          where: { status: { in: ['PENDING', 'IN_TRANSIT'] } },
          select: { id: true, reference: true },
        },
      },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return {
      ...vehicle,
      assignedShipments: vehicle.shipments,
      shipments: undefined,
      position: await this.telemetry.latest(id).catch(() => null),
    };
  }
  async create(dto: CreateVehicleDto, actorId: string) {
    try {
      return await serializable(this.prisma, async (tx) => {
        const vehicle = await tx.vehicle.create({
          data: { plate: dto.plate, capacityKg: dto.capacityKg },
        });
        await recordEvent(
          tx,
          'fleet.vehicle.updated',
          { vehicleId: vehicle.id, status: vehicle.status },
          actorId,
        );
        return vehicle;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException('Vehicle plate already exists');
      throw error;
    }
  }
  async change(id: string, dto: ChangeVehicleDto, actorId: string) {
    return serializable(this.prisma, async (tx) => {
      const vehicle = await tx.vehicle.findUnique({ where: { id } });
      if (!vehicle) throw new NotFoundException('Vehicle not found');
      if (
        vehicle.updatedAt.toISOString() !==
        new Date(dto.expectedUpdatedAt).toISOString()
      )
        throw new ConflictException('Vehicle changed. Reload before editing.');
      if (
        await tx.shipment.count({
          where: { vehicleId: id, status: 'IN_TRANSIT' },
        })
      )
        throw new ConflictException('Cannot change an active vehicle');
      const updated = await tx.vehicle.update({
        where: { id },
        data: { status: dto.status },
      });
      await recordEvent(
        tx,
        'fleet.vehicle.updated',
        {
          vehicleId: id,
          status: dto.status,
        },
        actorId,
      );
      return updated;
    });
  }
  async position(
    id: string,
    dto: PositionDto,
    origin?: { source: PositionSource; actorId?: string },
  ) {
    if (
      !(await this.prisma.vehicle.findUnique({
        where: { id },
        select: { id: true },
      }))
    )
      throw new NotFoundException('Vehicle not found');
    let result;
    try {
      result = await this.telemetry.save(id, dto, origin);
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof ServiceUnavailableException ||
        error instanceof BadRequestException
      )
        throw error;
      throw new ServiceUnavailableException('Telemetry storage unavailable');
    }
    await this.reconciler.process(result.position).catch(() => {
      throw new ServiceUnavailableException(
        'Telemetry persisted; processing pending. Retry the same observation ID.',
      );
    });
    return result.position;
  }
  async history(id: string, query: PositionQuery) {
    await this.detail(id);
    return this.telemetry.history(id, query);
  }
}
