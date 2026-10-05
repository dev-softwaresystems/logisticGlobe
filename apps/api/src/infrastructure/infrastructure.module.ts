import { EVENT_BUS, LocalEventBus } from './messaging/event-bus.js';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RuntimeEnvironment } from '../config/environment.js';
import { RedisEventBus } from './messaging/redis-event-bus.js';
import { PrismaService } from './database/prisma.service.js';
import { MongoService } from './database/mongo.service.js';
import { RedisService } from './cache/redis.service.js';
@Global()
@Module({
  providers: [
    PrismaService,
    MongoService,
    RedisService,
    {
      provide: LocalEventBus,
      inject: [ConfigService],
      useFactory: (config: ConfigService<RuntimeEnvironment, true>) =>
        config.get('DISTRIBUTED_REALTIME', { infer: true })
          ? new RedisEventBus(config.get('REDIS_URL', { infer: true }))
          : new LocalEventBus(),
    },
    { provide: EVENT_BUS, useExisting: LocalEventBus },
  ],
  exports: [
    PrismaService,
    MongoService,
    RedisService,
    LocalEventBus,
    EVENT_BUS,
  ],
})
export class InfrastructureModule {}
