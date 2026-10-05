import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module.js';
import { DashboardController } from './presentation/dashboard.controller.js';
import { DashboardService } from './application/dashboard.service.js';
import {
  DashboardRepository,
  PrismaDashboardRepository,
} from './infrastructure/dashboard.repository.js';
@Module({
  imports: [AuthModule],
  controllers: [DashboardController],
  providers: [
    DashboardService,
    { provide: DashboardRepository, useClass: PrismaDashboardRepository },
  ],
})
export class DashboardModule {}
