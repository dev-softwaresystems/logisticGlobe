import { Controller, Get, Inject, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AccessGuard } from '../../auth/access.guard.js';
import { Roles, RolesGuard } from '../../auth/roles.guard.js';
import { READ_ROLES } from '../../common/roles.js';
import { ShipmentQuery } from '../../shipments/shipments.dto.js';
import { ReportsService } from './reports.service.js';
@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(AccessGuard, RolesGuard)
@Roles(...READ_ROLES)
@Controller('reports')
export class ReportsController {
  constructor(
    @Inject(ReportsService) private readonly service: ReportsService,
  ) {}
  private download(res: Response, name: string, body: string) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="' + name + '.csv"',
    );
    res.type('text/csv; charset=utf-8').send(body);
  }
  @Get('shipments.csv') @ApiProduces('text/csv') async shipments(
    @Query() query: ShipmentQuery,
    @Res() res: Response,
  ) {
    this.download(res, 'envios', await this.service.shipments(query));
  }
  @Get('inventory.csv') @ApiProduces('text/csv') async inventory(
    @Res() res: Response,
  ) {
    this.download(res, 'inventario', await this.service.inventory());
  }
}
