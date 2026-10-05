import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { LocalEventBus } from '../../infrastructure/messaging/event-bus.js';
import { SystemHealthService } from './system-health.service.js';
@Injectable()
export class HealthBroadcaster implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private busy = false;
  private readonly previous = new Map<string, string>();
  constructor(
    @Inject(SystemHealthService) private readonly health: SystemHealthService,
    @Inject(LocalEventBus) private readonly bus: LocalEventBus,
  ) {}
  onModuleInit() {
    this.timer = setInterval(() => {
      void this.broadcast();
    }, 30000);
    this.timer.unref();
  }
  async broadcast() {
    if (this.busy) return;
    this.busy = true;
    try {
      const health = await this.health.services();
      for (const service of health.services) {
        if (this.previous.get(service.name) !== service.status) {
          await this.bus.publish({
            id: randomUUID(),
            name: 'system.health.updated',
            occurredAt: health.checkedAt,
            payload: {
              service: service.name,
              status: service.status,
              checkedAt: health.checkedAt,
            },
          });
          this.previous.set(service.name, service.status);
        }
      }
    } catch {
      /* A later probe retries safely while the transport recovers. */
    } finally {
      this.busy = false;
    }
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
