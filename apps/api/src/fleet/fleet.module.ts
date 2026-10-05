import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { FleetController } from './fleet.controller.js';
import { FleetService } from './fleet.service.js';
import { TelemetryRepository } from './infrastructure/telemetry.repository.js';
@Module({
  imports: [AuthModule],
  controllers: [FleetController],
  providers: [FleetService, TelemetryRepository],
  exports: [FleetService],
})
export class FleetModule {}
