import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AccessGuard } from '../../auth/access.guard.js';
import { Roles, RolesGuard } from '../../auth/roles.guard.js';
import type { AuthenticatedRequest } from '../../auth/access.guard.js';

import { READ_ROLES } from '../../common/roles.js';
import { MonitoringService } from './monitoring.service.js';
import { PlanDto, IncidentQuery, AcknowledgeDto } from './monitoring.dto.js';
@ApiTags('route-monitoring')
@ApiBearerAuth()
@UseGuards(AccessGuard, RolesGuard)
@Roles(...READ_ROLES)
@Controller('routing')
export class MonitoringController {
  constructor(
    @Inject(MonitoringService) private readonly service: MonitoringService,
  ) {}
  @Get('plans') plans(@Query() query: IncidentQuery) {
    return this.service.plans(query);
  }
  @Post('plans')
  @Roles('ADMIN', 'LOGISTICS_ADMIN', 'FLEET_SUPERVISOR', 'TRAFFIC_COORDINATOR')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  assign(@Body() dto: PlanDto, @Req() req: AuthenticatedRequest) {
    return this.service.assign(dto, req.user!.id);
  }
  @Get('incidents') incidents(@Query() query: IncidentQuery) {
    return this.service.incidents(query);
  }
  @Post('incidents/:id/acknowledge')
  @Roles('ADMIN', 'LOGISTICS_ADMIN', 'FLEET_SUPERVISOR', 'TRAFFIC_COORDINATOR')
  acknowledge(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AcknowledgeDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.acknowledge(id, dto, req.user!.id);
  }
}
