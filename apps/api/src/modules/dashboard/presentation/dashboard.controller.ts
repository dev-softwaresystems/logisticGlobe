import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AccessGuard } from '../../../auth/access.guard.js';
import { Roles, RolesGuard } from '../../../auth/roles.guard.js';
import { DashboardService } from '../application/dashboard.service.js';
import { DashboardSummaryDto } from './dashboard-summary.dto.js';
@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(AccessGuard, RolesGuard)
@Roles(
  'ADMIN',
  'LOGISTICS_ADMIN',
  'FLEET_SUPERVISOR',
  'TRAFFIC_COORDINATOR',
  'WAREHOUSE_MANAGER',
  'VIEWER',
)
@Controller('dashboard')
export class DashboardController {
  constructor(
    @Inject(DashboardService) private readonly dashboard: DashboardService,
  ) {}
  @Get('summary')
  @ApiOkResponse({ type: DashboardSummaryDto })
  summary() {
    return this.dashboard.summary();
  }
}
