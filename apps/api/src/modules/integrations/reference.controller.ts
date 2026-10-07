import { Body, Controller, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AccessGuard } from '../../auth/access.guard.js';
import type { AuthenticatedRequest } from '../../auth/access.guard.js';
import { Roles, RolesGuard } from '../../auth/roles.guard.js';
import { StockBatchDto, StockCsvDto } from './reference.dto.js';
import { ReferenceStockService } from './reference.service.js';
import { parseStockCsv } from './stock-csv.js';
@ApiTags('reference-stock-import')
@ApiBearerAuth()
@UseGuards(AccessGuard, RolesGuard)
@Roles('ADMIN', 'LOGISTICS_ADMIN', 'WAREHOUSE_MANAGER')
@Throttle({ default: { limit: 10, ttl: 60000 } })
@Controller('integrations/reference')
export class ReferenceStockController {
  constructor(
    @Inject(ReferenceStockService)
    private readonly service: ReferenceStockService,
  ) {}
  @Post('stock') import(
    @Body() dto: StockBatchDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.import(dto.records, req.user!.id);
  }
  @Post('stock.csv') csv(
    @Body() dto: StockCsvDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.import(parseStockCsv(dto.csv), req.user!.id);
  }
}
