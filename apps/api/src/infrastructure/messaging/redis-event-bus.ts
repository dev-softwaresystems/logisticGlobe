import { Redis } from 'ioredis';
import { Logger, ServiceUnavailableException } from '@nestjs/common';
import type { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import type {
  LogisticsEvent,
  LogisticsEventName,
} from '@logistics-globe/shared';
import { LocalEventBus } from './event-bus.js';
export class RedisEventBus
  extends LocalEventBus
  implements OnModuleInit, OnModuleDestroy
{
  private readonly publisher: Redis;
  private readonly subscriber: Redis;
  private readonly channel = 'logistics:events:v1';
  private readonly logger = new Logger('DistributedEvents');
  constructor(url: string) {
    super();
    this.publisher = new Redis(url, {
      lazyConnect: true,
      connectTimeout: 1500,
      commandTimeout: 2000,
      maxRetriesPerRequest: 1,
    });
    this.subscriber = this.publisher.duplicate();
    for (const client of [this.publisher, this.subscriber])
      client.on('error', () => this.logger.warn('Event transport unavailable'));
    this.subscriber.on('message', (channel, raw) => {
      if (channel !== this.channel || Buffer.byteLength(raw) > 16384) return;
      try {
        const event = JSON.parse(raw) as LogisticsEvent;
        if (
          typeof event.id !== 'string' ||
          !event.payload ||
          ![
            'fleet.position.updated',
            'route.plan.updated',
            'route.incident.updated',
            'fleet.vehicle.updated',
            'shipment.status.updated',
            'inventory.threshold.breached',
            'inventory.updated',
            'inventory.warehouse.updated',
            'system.health.updated',
          ].includes(event.name)
        )
          return;
        void super
          .publish(event)
          .catch(() => this.logger.warn('Local event delivery deferred'));
      } catch {
        this.logger.warn('Invalid event envelope ignored');
      }
    });
  }
  async onModuleInit() {
    await Promise.all([this.publisher.connect(), this.subscriber.connect()]);
    await this.subscriber.subscribe(this.channel);
  }
  override async publish<K extends LogisticsEventName>(
    event: LogisticsEvent<K>,
  ): Promise<void> {
    try {
      await this.publisher.publish(this.channel, JSON.stringify(event));
    } catch {
      throw new ServiceUnavailableException('Event transport unavailable');
    }
  }
  onModuleDestroy() {
    this.publisher.disconnect();
    this.subscriber.disconnect();
  }
}
