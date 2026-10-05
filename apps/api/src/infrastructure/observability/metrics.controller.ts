import {
  Controller,
  Get,
  Headers,
  Inject,
  Res,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual, createHash } from 'node:crypto';
import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { registry } from './metrics.js';
import type { RuntimeEnvironment } from '../../config/environment.js';
@ApiTags('observability')
@Controller('metrics')
export class MetricsController {
  constructor(
    @Inject(ConfigService)
    private readonly config: ConfigService<RuntimeEnvironment, true>,
  ) {}
  @Get()
  @SkipThrottle()
  async metrics(
    @Headers('authorization') authorization: string | undefined,
    @Res() res: Response,
  ) {
    const token = this.config.get('METRICS_TOKEN', { infer: true });
    if (!token)
      throw new ServiceUnavailableException('Metrics access is not configured');
    const received = authorization?.startsWith('Bearer ')
      ? authorization.slice(7)
      : '';
    if (
      received.length > 4096 ||
      !timingSafeEqual(
        createHash('sha256').update(received).digest(),
        createHash('sha256').update(token).digest(),
      )
    )
      throw new UnauthorizedException('Authentication required');
    res.setHeader('Content-Type', registry.contentType);
    res.setHeader('Cache-Control', 'no-store');
    res.send(await registry.metrics());
  }
}
