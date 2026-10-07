import { Controller, Get, Inject, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AccessGuard } from '../../auth/access.guard.js';
import { Roles, RolesGuard } from '../../auth/roles.guard.js';
import { READ_ROLES } from '../../common/roles.js';
import { ShipmentQuery } from '../../shipments/shipments.dto.js';
import { ReportsService } from './reports.service.js';
import { ExecutiveService } from './executive.service.js';
import { ExecutiveQuery } from './executive.dto.js';
import { Throttle } from '@nestjs/throttler';
@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(AccessGuard, RolesGuard)
@Roles(...READ_ROLES)
@Controller('reports')
export class ReportsController {
  constructor(
    @Inject(ReportsService) private readonly service: ReportsService,
    @Inject(ExecutiveService) private readonly executive: ExecutiveService,
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
  @Get('dashboard') @Throttle({ default: { limit: 10, ttl: 60000 } }) data(
    @Query() query: ExecutiveQuery,
  ) {
    return this.executive.data(query);
  }
  private async executiveDownload(
    format: 'pdf' | 'xlsx',
    query: ExecutiveQuery,
    res: Response,
  ) {
    const body = await this.executive.download(format, query);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="LogisticsGlobe-dashboard.' + format + '"',
    );
    res
      .type(
        format === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      .send(body);
  }
  @Get('dashboard.pdf')
  @ApiProduces('application/pdf')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  pdf(@Query() query: ExecutiveQuery, @Res() res: Response) {
    return this.executiveDownload('pdf', query, res);
  }
  @Get('dashboard.xlsx')
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  xlsx(@Query() query: ExecutiveQuery, @Res() res: Response) {
    return this.executiveDownload('xlsx', query, res);
  }
}
