import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Module,
  Post,
  ServiceUnavailableException,
  UnauthorizedException,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsUUID } from 'class-validator';
import { ApiProperty, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { createHash, timingSafeEqual } from 'node:crypto';
import { FleetModule } from '../../fleet/fleet.module.js';
import { FleetService } from '../../fleet/fleet.service.js';
import { PositionDto } from '../../fleet/fleet.dto.js';
import { AuthModule } from '../../auth/auth.module.js';
import { AccessGuard } from '../../auth/access.guard.js';
import { Roles, RolesGuard } from '../../auth/roles.guard.js';
import { READ_ROLES } from '../../common/roles.js';
import type { RuntimeEnvironment } from '../../config/environment.js';
class GpsPositionDto extends PositionDto {
  @ApiProperty() @IsUUID() vehicleId!: string;
}
@ApiTags('integrations')
@Controller('integrations')
class IntegrationsController {
  constructor(
    @Inject(ConfigService)
    private readonly config: ConfigService<RuntimeEnvironment, true>,
    @Inject(FleetService) private readonly fleet: FleetService,
  ) {}
  @Get('status')
  @UseGuards(AccessGuard, RolesGuard)
  @Roles(...READ_ROLES)
  @ApiBearerAuth()
  status() {
    return {
      gpsConfigured: !!this.config.get('GPS_INGEST_TOKEN', { infer: true }),
      routingConfigured: !!this.config.get('ROUTING_URL', { infer: true }),
    };
  }
  @Post('gps/positions')
  @Throttle({ default: { ttl: 60000, limit: 6000 } })
  @ApiBearerAuth()
  position(
    @Headers('authorization') header: string | undefined,
    @Body() dto: GpsPositionDto,
  ) {
    const token = this.config.get('GPS_INGEST_TOKEN', { infer: true });
    if (!token)
      throw new ServiceUnavailableException(
        'GPS integration is not configured',
      );
    const received = header?.startsWith('Bearer ') ? header.slice(7) : '';
    if (
      received.length > 4096 ||
      !timingSafeEqual(
        createHash('sha256').update(token).digest(),
        createHash('sha256').update(received).digest(),
      )
    )
      throw new UnauthorizedException('Integration authentication required');
    if (
      !this.config
        .get('GPS_ALLOWED_VEHICLE_IDS', { infer: true })
        .includes(dto.vehicleId)
    )
      throw new ForbiddenException('Vehicle outside integration scope');
    const { vehicleId, ...position } = dto;
    return this.fleet.position(vehicleId, position);
  }
}
@Module({
  imports: [AuthModule, FleetModule],
  controllers: [IntegrationsController],
})
export class IntegrationsModule {}
