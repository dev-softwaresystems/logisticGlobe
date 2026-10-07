import { Inject, Injectable, Logger } from '@nestjs/common';
import type { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { DashboardRepository } from '../infrastructure/dashboard.repository.js';
@Injectable()
export class SnapshotCapture implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private busy = false;
  private readonly logger = new Logger(SnapshotCapture.name);
  constructor(
    @Inject(DashboardRepository)
    private readonly repository: DashboardRepository,
  ) {}
  onModuleInit() {
    this.timer = setInterval(() => {
      void this.capture();
    }, 60000);
    this.timer.unref();
  }
  private async capture() {
    if (this.busy) return;
    this.busy = true;
    try {
      await this.repository.summary();
    } catch {
      this.logger.warn('Dashboard snapshot capture deferred');
    } finally {
      this.busy = false;
    }
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
