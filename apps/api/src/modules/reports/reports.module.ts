import { Module } from '@nestjs/common';
import { ExecutiveService } from './executive.service.js';
import { SystemHealthModule } from '../system-health/system-health.module.js';
import { AuthModule } from '../../auth/auth.module.js';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';
@Module({
  imports: [AuthModule, SystemHealthModule],
  controllers: [ReportsController],
  providers: [ReportsService, ExecutiveService],
})
export class ReportsModule {}
