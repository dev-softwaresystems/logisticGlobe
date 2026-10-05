import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import type { RuntimeEnvironment } from '../../config/environment.js';
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(
    @Inject(ConfigService) config: ConfigService<RuntimeEnvironment, true>,
  ) {
    super({
      adapter: new PrismaPg({
        connectionString: config.get('DATABASE_URL', { infer: true }),
        connectionTimeoutMillis: 2000,
        query_timeout: 5000,
        max: 10,
      }),
      errorFormat: 'minimal',
    });
  }
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
