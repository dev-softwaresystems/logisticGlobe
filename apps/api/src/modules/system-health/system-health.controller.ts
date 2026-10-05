import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SystemHealthService } from './system-health.service.js';
@ApiTags('health')
@Controller('health')
export class SystemHealthController {
  constructor(
    @Inject(SystemHealthService) private readonly health: SystemHealthService,
  ) {}
  @Get()
  @SkipThrottle()
  @ApiOperation({
    summary: 'API liveness; dependency readiness is reported separately',
  })
  liveness() {
    return {
      status: 'up',
      service: 'LogisticsGlobe API',
      timestamp: new Date().toISOString(),
    };
  }
  @Get('ready')
  @SkipThrottle()
  async ready() {
    const health = await this.health.services();
    if (health.status !== 'up')
      throw new ServiceUnavailableException('Dependencies unavailable');
    return { status: 'up' };
  }
  @Get('services')
  @ApiOperation({
    summary: 'Safe readiness and measured latency of local dependencies',
  })
  services() {
    return this.health.services();
  }
}
