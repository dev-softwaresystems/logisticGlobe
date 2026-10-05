import { Inject, Injectable } from '@nestjs/common';
import type {
  ServiceHealth,
  ServiceName,
  ServicesHealth,
} from '@logistics-globe/shared';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { MongoService } from '../../infrastructure/database/mongo.service.js';
import { RedisService } from '../../infrastructure/cache/redis.service.js';
@Injectable()
export class SystemHealthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MongoService) private readonly mongo: MongoService,
    @Inject(RedisService) private readonly redis: RedisService,
  ) {}
  private async check(
    name: ServiceName,
    probe: () => Promise<unknown>,
  ): Promise<ServiceHealth> {
    const start = performance.now();
    let status: ServiceHealth['status'] = 'up';
    try {
      await probe();
    } catch {
      status = 'down';
    }
    return {
      name,
      status,
      latencyMs: Math.round((performance.now() - start) * 100) / 100,
    };
  }
  async services(): Promise<ServicesHealth> {
    const services = [
      { name: 'api' as const, status: 'up' as const, latencyMs: null },
      ...(await Promise.all([
        this.check('postgresql', () => this.prisma.$queryRaw`SELECT 1`),
        this.check('mongodb', () => this.mongo.ping()),
        this.check('redis', () => this.redis.ping()),
      ])),
    ];
    return {
      status: services.every((service) => service.status === 'up')
        ? 'up'
        : 'degraded',
      services,
      checkedAt: new Date().toISOString(),
    };
  }
}
