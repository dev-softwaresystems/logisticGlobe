import {
  Body,
  Controller,
  Inject,
  Module,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthModule } from '../../auth/auth.module.js';
import { AccessGuard } from '../../auth/access.guard.js';
import { Roles, RolesGuard } from '../../auth/roles.guard.js';
import { READ_ROLES } from '../../common/roles.js';
import type { RuntimeEnvironment } from '../../config/environment.js';
import { OsrmAdapter } from './osrm.adapter.js';
import { RouteDto } from './routing.dto.js';
import { ROUTING_PROVIDER, RoutingService } from './routing.service.js';
import { MonitoringService } from './monitoring.service.js';
import { MonitoringController } from './monitoring.controller.js';
@ApiTags('routing')
@ApiBearerAuth()
@Controller('routing')
@UseGuards(AccessGuard, RolesGuard)
@Roles(...READ_ROLES)
class RoutingController {
  constructor(
    @Inject(RoutingService) private readonly routing: RoutingService,
  ) {}
  @Post('route')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  route(@Body() dto: RouteDto) {
    return this.routing.route(dto);
  }
}
@Module({
  imports: [AuthModule],
  controllers: [RoutingController, MonitoringController],
  exports: [RoutingService, MonitoringService],
  providers: [
    RoutingService,
    MonitoringService,
    {
      provide: ROUTING_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<RuntimeEnvironment, true>) =>
        new OsrmAdapter(config.get('ROUTING_URL', { infer: true })),
    },
  ],
})
export class RoutingModule {}
