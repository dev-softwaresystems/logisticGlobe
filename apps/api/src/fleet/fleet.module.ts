import { Module } from '@nestjs/common';
import { RoutingModule } from '../modules/routing/routing.module.js';
import { TelemetryReconciler } from './infrastructure/telemetry-reconciler.js';
import { AuthModule } from '../auth/auth.module.js';
import { FleetController } from './fleet.controller.js';
import { FleetService } from './fleet.service.js';
import { TelemetryRepository } from './infrastructure/telemetry.repository.js';
@Module({
  imports: [AuthModule, RoutingModule],
  controllers: [FleetController],
  providers: [FleetService, TelemetryRepository, TelemetryReconciler],
  exports: [FleetService],
})
export class FleetModule {}
