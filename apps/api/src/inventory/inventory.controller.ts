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
import { INVENTORY_WRITE, READ_ROLES } from '../common/roles.js';
import { PaginationDto } from '../common/pagination.dto.js';
import { InventoryService } from './inventory.service.js';
import {
  AdjustItemDto,
  CreateItemDto,
  CreateWarehouseDto,
  InventoryQuery,
} from './inventory.dto.js';
@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(AccessGuard, RolesGuard)
@Roles(...READ_ROLES)
@Controller('inventory')
export class InventoryController {
  constructor(
    @Inject(InventoryService) private readonly service: InventoryService,
  ) {}
  @Get() list(@Query() query: InventoryQuery) {
    return this.service.list(query);
  }
  @Get('alerts') alerts(@Query() query: InventoryQuery) {
    return this.service.alerts(query);
  }
  @Get('warehouses') warehouses(@Query() query: PaginationDto) {
    return this.service.warehouses(query);
  }
  @Post('warehouses') @Roles(...INVENTORY_WRITE) warehouse(
    @Body() dto: CreateWarehouseDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.createWarehouse(dto, req.user!.id);
  }
  @Post() @Roles(...INVENTORY_WRITE) create(
    @Body() dto: CreateItemDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.create(dto, req.user!.id);
  }
  @Patch(':id') @Roles(...INVENTORY_WRITE) adjust(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustItemDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.adjust(id, dto, req.user!.id);
  }
  @Get(':id/movements') movements(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationDto,
  ) {
    return this.service.movements(id, query);
  }
}
