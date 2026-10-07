import { Inject, Injectable, Logger } from '@nestjs/common';
import type { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { TelemetryRepository } from './telemetry.repository.js';
import { MonitoringService } from '../../modules/routing/monitoring.service.js';
import { EVENT_BUS } from '../../infrastructure/messaging/event-bus.js';
import type { EventBus, Position } from '@logistics-globe/shared';
import { monitoringLag } from '../../infrastructure/observability/metrics.js';
@Injectable()
export class TelemetryReconciler implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private logger = new Logger(TelemetryReconciler.name);
  constructor(
    @Inject(TelemetryRepository)
    private readonly telemetry: TelemetryRepository,
    @Inject(MonitoringService) private readonly monitoring: MonitoringService,
    @Inject(EVENT_BUS) private readonly bus: EventBus,
  ) {}
  async process(position: Position) {
    await this.monitoring.evaluate(position);
    await this.bus.publish({
      id: position.id,
      name: 'fleet.position.updated',
      occurredAt: position.receivedAt,
      payload: {
        vehicleId: position.vehicleId,
        latitude: position.latitude,
        longitude: position.longitude,
        observedAt: position.observedAt,
      },
    });
    await this.telemetry.complete(position.id);
    monitoringLag.observe(
      Math.max(
        0,
        (Date.now() - new Date(position.receivedAt).getTime()) / 1000,
      ),
    );
  }
  onModuleInit() {
    this.timer = setInterval(() => {
      void this.flush();
    }, 2000);
    this.timer.unref();
  }
  async flush() {
    if (this.running) return;
    this.running = true;
    try {
      for (const point of await this.telemetry.pending())
        await this.process(point);
    } catch {
      this.logger.warn('Durable telemetry reconciliation deferred');
    } finally {
      this.running = false;
    }
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
