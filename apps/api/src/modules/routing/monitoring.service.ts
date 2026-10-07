import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Position } from '@logistics-globe/shared';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { RedisService } from '../../infrastructure/cache/redis.service.js';
import { serializable } from '../../common/transaction.js';
import { recordEvent } from '../../infrastructure/messaging/outbox.js';
import { RoutingService } from './routing.service.js';
import { evaluateObservation } from './monitoring-domain.js';
import type { MonitorParameters, MonitorState } from './monitoring-domain.js';
import type {
  PlanDto,
  IncidentQuery,
  AcknowledgeDto,
} from './monitoring.dto.js';
@Injectable()
export class MonitoringService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RoutingService) private readonly routing: RoutingService,
    @Inject(RedisService) private readonly redis: RedisService,
  ) {}
  async assign(dto: PlanDto, actorId: string) {
    const fingerprint = createHash('sha256')
      .update(
        JSON.stringify([
          dto.requestId,
          dto.vehicleId,
          [...dto.shipmentIds].sort(),
          [dto.origin.latitude, dto.origin.longitude],
          [dto.destination.latitude, dto.destination.longitude],
          dto.corridorMeters,
          dto.confirmSeconds,
          dto.confirmObservations,
          dto.stopRadiusMeters,
          dto.stopSeconds,
          dto.maxGapSeconds,
          dto.maxAccuracyMeters,
          dto.authorizedStops.map((p) => [
            p.latitude,
            p.longitude,
            p.radiusMeters,
            p.reference ?? null,
          ]),
        ]),
      )
      .digest('hex');
    const prior = await this.prisma.routePlan.findUnique({
      where: { requestId: dto.requestId },
    });
    if (prior) {
      if (prior.requestHash !== fingerprint)
        throw new ConflictException('Plan request ID already used');
      return prior;
    }
    if (dto.maxGapSeconds >= dto.stopSeconds)
      throw new BadRequestException(
        'maxGapSeconds must be smaller than stopSeconds',
      );
    if (
      !(await this.prisma.vehicle.findUnique({
        where: { id: dto.vehicleId },
        select: { id: true },
      }))
    )
      throw new NotFoundException('Vehicle not found');
    if (
      (await this.prisma.shipment.count({
        where: {
          id: { in: dto.shipmentIds },
          vehicleId: dto.vehicleId,
          status: { in: ['PENDING', 'IN_TRANSIT'] },
        },
      })) !== dto.shipmentIds.length
    )
      throw new ConflictException(
        'Shipments must be active and assigned to vehicle',
      );
    const route = await this.routing.route({
      origin: dto.origin,
      destination: dto.destination,
    });
    const parameters: MonitorParameters = {
      corridorMeters: dto.corridorMeters,
      confirmSeconds: dto.confirmSeconds,
      confirmObservations: dto.confirmObservations,
      stopRadiusMeters: dto.stopRadiusMeters,
      stopSeconds: dto.stopSeconds,
      maxGapSeconds: dto.maxGapSeconds,
      maxAccuracyMeters: dto.maxAccuracyMeters,
      authorizedStops: dto.authorizedStops,
    };
    return serializable(this.prisma, async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${dto.vehicleId}))`;
      const existing = await tx.routePlan.findUnique({
        where: { requestId: dto.requestId },
      });
      if (existing) {
        if (existing.requestHash !== fingerprint)
          throw new ConflictException('Plan request ID already used');
        return existing;
      }
      if (!(await tx.vehicle.findUnique({ where: { id: dto.vehicleId } })))
        throw new NotFoundException('Vehicle not found');
      if (
        (await tx.shipment.count({
          where: {
            id: { in: dto.shipmentIds },
            vehicleId: dto.vehicleId,
            status: { in: ['PENDING', 'IN_TRANSIT'] },
          },
        })) !== dto.shipmentIds.length
      )
        throw new ConflictException(
          'All shipments must be assigned to this vehicle and pending or in transit',
        );
      const previous = await tx.routePlan.findFirst({
        where: { vehicleId: dto.vehicleId },
        orderBy: { version: 'desc' },
      });
      const at = new Date();
      const old = await tx.routePlan.findMany({
        where: { vehicleId: dto.vehicleId, retiredAt: null },
        select: { id: true },
      });
      for (const plan of old)
        for (const incident of await tx.routeIncident.findMany({
          where: { planId: plan.id, resolvedAt: null },
        })) {
          await tx.routeIncident.update({
            where: { id: incident.id },
            data: {
              resolvedAt: at,
              history: { create: { action: 'PLAN_REPLACED', actorId } },
            },
          });
          await recordEvent(
            tx,
            'route.incident.updated',
            {
              incidentId: incident.id,
              vehicleId: dto.vehicleId,
              kind: incident.kind,
              resolved: true,
            },
            actorId,
          );
        }
      await tx.routePlan.updateMany({
        where: { vehicleId: dto.vehicleId, retiredAt: null },
        data: { retiredAt: at },
      });
      const plan = await tx.routePlan.create({
        data: {
          vehicleId: dto.vehicleId,
          version: (previous?.version ?? 0) + 1,
          requestId: dto.requestId,
          requestHash: fingerprint,
          shipmentIds: dto.shipmentIds,
          geometry: route.coordinates,
          parameters: parameters as unknown as Prisma.InputJsonValue,
          actorId,
          effectiveAt: at,
        },
      });
      await recordEvent(
        tx,
        'route.plan.updated',
        { planId: plan.id, vehicleId: dto.vehicleId, version: plan.version },
        actorId,
      );
      return plan;
    });
  }
  async plans(query: IncidentQuery) {
    const where = { vehicleId: query.vehicleId, retiredAt: null };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.routePlan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.pageSize,
        skip: (query.page - 1) * query.pageSize,
      }),
      this.prisma.routePlan.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }
  async incidents(query: IncidentQuery) {
    const where = { plan: { vehicleId: query.vehicleId } };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.routeIncident.findMany({
        where,
        include: {
          plan: { select: { vehicleId: true, version: true } },
          history: { orderBy: { occurredAt: 'asc' } },
        },
        orderBy: { startedAt: 'desc' },
        take: query.pageSize,
        skip: (query.page - 1) * query.pageSize,
      }),
      this.prisma.routeIncident.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }
  async acknowledge(id: string, dto: AcknowledgeDto, actorId: string) {
    return serializable(this.prisma, async (tx) => {
      const incident = await tx.routeIncident.findUnique({
        where: { id },
        include: { plan: true },
      });
      if (!incident) throw new NotFoundException('Incident not found');
      if (
        incident.lastObservedAt.toISOString() !==
        new Date(dto.expectedLastObservedAt).toISOString()
      )
        throw new ConflictException('Incident changed; reload');
      if (incident.acknowledgedAt) return incident;
      const updated = await tx.routeIncident.update({
        where: { id },
        data: {
          acknowledgedBy: actorId,
          acknowledgedAt: new Date(),
          history: {
            create: { action: 'ACKNOWLEDGED', actorId, note: dto.note },
          },
        },
      });
      await recordEvent(
        tx,
        'route.incident.updated',
        {
          incidentId: id,
          vehicleId: incident.plan.vehicleId,
          kind: incident.kind,
          resolved: !!incident.resolvedAt,
        },
        actorId,
      );
      return updated;
    });
  }
  async evaluate(position: Position) {
    const result = await serializable(this.prisma, async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${position.vehicleId}))`;
      const plan = await tx.routePlan.findFirst({
        where: {
          vehicleId: position.vehicleId,
          effectiveAt: { lte: new Date(position.observedAt) },
          OR: [
            { retiredAt: null },
            { retiredAt: { gt: new Date(position.observedAt) } },
          ],
        },
        orderBy: { version: 'desc' },
      });
      if (!plan) return { status: 'no-effective-plan' };
      // Retired plans never reopen incidents after replacement.
      if (plan.retiredAt) return { status: 'retired-plan' };
      const saved = await tx.monitoringState.findUnique({
        where: { planId: plan.id },
      });
      const evaluation = evaluateObservation(
        (saved?.state ?? {}) as MonitorState,
        position,
        plan.geometry as [number, number][],
        plan.parameters as unknown as MonitorParameters,
      );
      if (evaluation.ignored) return { status: evaluation.ignored };
      for (const [kind, open, resolve, openingId, since] of [
        [
          'DEVIATION',
          evaluation.openDeviation,
          evaluation.resolveDeviation,
          evaluation.state.outsideId,
          evaluation.state.outsideSince,
        ],
        [
          'UNSCHEDULED_STOP',
          evaluation.openStop,
          evaluation.resolveStop,
          evaluation.state.anchorId,
          evaluation.state.anchorAt,
        ],
      ] as const) {
        const current = await tx.routeIncident.findFirst({
          where: { planId: plan.id, kind, resolvedAt: null },
        });
        if (current) {
          await tx.routeIncident.update({
            where: { id: current.id },
            data: {
              lastObservedAt: new Date(position.observedAt),
              ...(resolve
                ? {
                    resolvedAt: new Date(position.observedAt),
                    history: {
                      create: {
                        action: 'RESOLVED',
                        observationId: position.id,
                      },
                    },
                  }
                : {}),
            },
          });
          if (resolve)
            await recordEvent(tx, 'route.incident.updated', {
              incidentId: current.id,
              vehicleId: position.vehicleId,
              kind,
              resolved: true,
            });
        } else if (open && openingId && since) {
          const incident = await tx.routeIncident.create({
            data: {
              planId: plan.id,
              kind,
              openingObservationId: openingId,
              startedAt: new Date(since),
              lastObservedAt: new Date(position.observedAt),
              history: {
                create: { action: 'OPENED', observationId: position.id },
              },
            },
          });
          await recordEvent(tx, 'route.incident.updated', {
            incidentId: incident.id,
            vehicleId: position.vehicleId,
            kind,
            resolved: false,
          });
        }
      }
      const data = {
        lastObservationId: position.id,
        lastObservedAt: new Date(position.observedAt),
        state: JSON.parse(
          JSON.stringify(evaluation.state),
        ) as Prisma.InputJsonValue,
      };
      await tx.monitoringState.upsert({
        where: { planId: plan.id },
        create: { planId: plan.id, ...data },
        update: data,
      });
      return {
        status: 'evaluated',
        planId: plan.id,
        lastObservedAt: position.observedAt,
        distanceMeters: evaluation.distanceMeters,
      };
    });
    await this.redis
      .set('monitoring:' + position.vehicleId, JSON.stringify(result), 60)
      .catch(() => undefined);
    return result;
  }
}
