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
import type { AuthenticatedRequest } from '../auth/access.guard.js';
import { Roles, RolesGuard } from '../auth/roles.guard.js';
import { READ_ROLES, SHIPMENT_WRITE } from '../common/roles.js';
import { ShipmentsService } from './shipments.service.js';
import {
  ChangeShipmentDto,
  CreateShipmentDto,
  ShipmentQuery,
} from './shipments.dto.js';
@ApiTags('shipments')
@ApiBearerAuth()
@UseGuards(AccessGuard, RolesGuard)
@Roles(...READ_ROLES)
@Controller('shipments')
export class ShipmentsController {
  constructor(
    @Inject(ShipmentsService) private readonly service: ShipmentsService,
  ) {}
  @Get() list(@Query() query: ShipmentQuery) {
    return this.service.list(query);
  }
  @Get(':id') detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.detail(id);
  }
  @Post() @Roles(...SHIPMENT_WRITE) create(
    @Body() dto: CreateShipmentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.create(dto, req.user!.id);
  }
  @Patch(':id/status') @Roles(...SHIPMENT_WRITE) change(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeShipmentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.change(id, dto, req.user!.id);
  }
}
