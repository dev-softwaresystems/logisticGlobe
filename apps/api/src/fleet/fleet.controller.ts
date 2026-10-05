import type { AuthenticatedRequest } from '../auth/access.guard.js';
import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessGuard } from '../auth/access.guard.js';
import { Roles, RolesGuard } from '../auth/roles.guard.js';
import { FLEET_WRITE, READ_ROLES } from '../common/roles.js';
import { FleetService } from './fleet.service.js';
import {
  ChangeVehicleDto,
  CreateVehicleDto,
  PositionDto,
  PositionQuery,
  VehicleQuery,
} from './fleet.dto.js';
@ApiTags('fleet')
@ApiBearerAuth()
@UseGuards(AccessGuard, RolesGuard)
@Roles(...READ_ROLES)
@Controller('fleet/vehicles')
export class FleetController {
  constructor(@Inject(FleetService) private readonly service: FleetService) {}
  @Get() list(@Query() query: VehicleQuery) {
    return this.service.list(query);
  }
  @Get(':id') detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.detail(id);
  }
  @Post() @Roles(...FLEET_WRITE) create(
    @Body() dto: CreateVehicleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.create(dto, req.user!.id);
  }
  @Patch(':id') @Roles(...FLEET_WRITE) change(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeVehicleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.change(id, dto, req.user!.id);
  }
  @Post(':id/positions') @Roles(...FLEET_WRITE) position(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PositionDto,
  ) {
    return this.service.position(id, dto);
  }
  @Get(':id/positions') history(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PositionQuery,
  ) {
    return this.service.history(id, query);
  }
}
