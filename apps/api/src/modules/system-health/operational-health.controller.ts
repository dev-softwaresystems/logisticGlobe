import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessGuard } from '../../auth/access.guard.js';
import { Roles, RolesGuard } from '../../auth/roles.guard.js';
import { READ_ROLES } from '../../common/roles.js';
import { OperationalHealthService } from './operational-health.service.js';
@ApiTags('operational-health')
@ApiBearerAuth()
@UseGuards(AccessGuard, RolesGuard)
@Roles(...READ_ROLES)
@Controller('health')
export class OperationalHealthController {
  constructor(
    @Inject(OperationalHealthService)
    private readonly health: OperationalHealthService,
  ) {}
  @Get('operations') inspect() {
    return this.health.inspect();
  }
}
