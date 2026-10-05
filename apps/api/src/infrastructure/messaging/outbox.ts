import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  LogisticsEvent,
  LogisticsEventName,
  LogisticsEventPayloads,
} from '@logistics-globe/shared';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import { LocalEventBus } from './event-bus.js';
export async function recordEvent<K extends LogisticsEventName>(
  tx: Prisma.TransactionClient,
  name: K,
  payload: LogisticsEventPayloads[K],
  actorId?: string,
) {
  const event = {
    id: randomUUID(),
    name,
    payload,
    occurredAt: new Date().toISOString(),
  };
  await tx.outboxEvent.create({
    data: {
      id: event.id,
      actorId,
      body: JSON.parse(JSON.stringify(event)) as Prisma.InputJsonValue,
    },
  });
}
@Injectable()
export class OutboxDispatcher implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private readonly owner = randomUUID();
  private readonly logger = new Logger(OutboxDispatcher.name);
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(LocalEventBus) private readonly bus: LocalEventBus,
  ) {}
  onModuleInit() {
    this.timer = setInterval(() => {
      void this.flush();
    }, 1000);
    this.timer.unref();
  }
  async flush(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const events = await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.$queryRaw<
          { id: string }[]
        >`SELECT id FROM "OutboxEvent" WHERE "deliveredAt" IS NULL AND ("leaseUntil" IS NULL OR "leaseUntil"<NOW()) ORDER BY "createdAt",id LIMIT 10 FOR UPDATE SKIP LOCKED`;
        const ids = claimed.map((event) => event.id);
        if (!ids.length) return [];
        await tx.outboxEvent.updateMany({
          where: { id: { in: ids } },
          data: {
            leaseOwner: this.owner,
            leaseUntil: new Date(Date.now() + 60000),
          },
        });
        return tx.outboxEvent.findMany({
          where: { id: { in: ids } },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        });
      });
      for (const event of events) {
        try {
          await this.bus.publish(event.body as unknown as LogisticsEvent);
          await this.prisma.outboxEvent.updateMany({
            where: { id: event.id, leaseOwner: this.owner, deliveredAt: null },
            data: {
              deliveredAt: new Date(),
              leaseOwner: null,
              leaseUntil: null,
            },
          });
        } catch {
          await this.prisma.outboxEvent.updateMany({
            where: { id: event.id, leaseOwner: this.owner },
            data: { leaseOwner: null, leaseUntil: null },
          });
          this.logger.warn('Outbox delivery deferred');
        }
      }
    } catch {
      this.logger.warn('Outbox delivery deferred');
    } finally {
      this.running = false;
    }
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
