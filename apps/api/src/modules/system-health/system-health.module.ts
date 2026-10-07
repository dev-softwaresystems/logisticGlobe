import { HealthBroadcaster } from './health-broadcaster.js';
import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module.js';
import { OperationalHealthController } from './operational-health.controller.js';
import { OperationalHealthService } from './operational-health.service.js';
import { MetricsController } from '../../infrastructure/observability/metrics.controller.js';
import { SystemHealthController } from './system-health.controller.js';
import { SystemHealthService } from './system-health.service.js';
@Module({
  imports: [AuthModule],
  controllers: [
    SystemHealthController,
    MetricsController,
    OperationalHealthController,
  ],
  providers: [SystemHealthService, HealthBroadcaster, OperationalHealthService],
  exports: [OperationalHealthService],
})
export class SystemHealthModule {}
