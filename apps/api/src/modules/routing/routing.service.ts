import { Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import type { RoutingRequest, RoutingResult } from '@logistics-globe/shared';
import type { RuntimeEnvironment } from '../../config/environment.js';
import { RedisService } from '../../infrastructure/cache/redis.service.js';
import { routingDuration } from '../../infrastructure/observability/metrics.js';
import type { RoutingProvider } from './osrm.adapter.js';
export const ROUTING_PROVIDER = Symbol('ROUTING_PROVIDER');
@Injectable()
export class RoutingService {
  constructor(
    @Inject(ROUTING_PROVIDER) private readonly provider: RoutingProvider,
    @Inject(RedisService) private readonly redis: RedisService,
    @Inject(ConfigService)
    private readonly config: ConfigService<RuntimeEnvironment, true>,
  ) {}
  async route(input: RoutingRequest): Promise<RoutingResult> {
    const stop = routingDuration.startTimer();
    const key =
      'routing:' +
      createHash('sha256')
        .update(
          JSON.stringify([
            this.config.get('ROUTING_URL', { infer: true }),
            input,
          ]),
        )
        .digest('hex');
    try {
      const cached = await this.redis.get(key).catch(() => null);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as RoutingResult;
          if (
            parsed.provider === 'osrm' &&
            Array.isArray(parsed.coordinates) &&
            typeof parsed.distanceMeters === 'number' &&
            typeof parsed.durationSeconds === 'number'
          ) {
            stop({ result: 'cache' });
            return { ...parsed, cached: true };
          }
        } catch {
          /* recompute corrupt cache */
        }
      }
      const result = { ...(await this.provider.route(input)), cached: false };
      await this.redis
        .set(key, JSON.stringify(result), 300)
        .catch(() => undefined);
      stop({ result: 'provider' });
      return result;
    } catch (error) {
      stop({ result: 'error' });
      throw error;
    }
  }
}
