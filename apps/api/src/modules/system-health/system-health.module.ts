import { HealthBroadcaster } from './health-broadcaster.js';
import { Module } from '@nestjs/common';
import { MetricsController } from '../../infrastructure/observability/metrics.controller.js';
import { SystemHealthController } from './system-health.controller.js';
import { SystemHealthService } from './system-health.service.js';
@Module({
  controllers: [SystemHealthController, MetricsController],
  providers: [SystemHealthService, HealthBroadcaster],
})
export class SystemHealthModule {}
