import { ReportsModule } from './modules/reports/reports.module.js';
import { MessagingModule } from './infrastructure/messaging/messaging.module.js';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './infrastructure/cache/redis.service.js';
import { RedisThrottlerStorage } from './infrastructure/cache/redis-throttler.storage.js';
import type { RuntimeEnvironment } from './config/environment.js';
import { RoutingModule } from './modules/routing/routing.module.js';
import { IntegrationsModule } from './modules/integrations/integrations.module.js';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnvironment } from './config/environment.js';
import { InfrastructureModule } from './infrastructure/infrastructure.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { ShipmentsModule } from './shipments/shipments.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { FleetModule } from './fleet/fleet.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { SystemHealthModule } from './modules/system-health/system-health.module.js';
import { AlertsModule } from './modules/alerts/alerts.module.js';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate: validateEnvironment,
    }),
    ThrottlerModule.forRootAsync({
      imports: [InfrastructureModule],
      inject: [ConfigService, RedisService],
      useFactory: (
        config: ConfigService<RuntimeEnvironment, true>,
        redis: RedisService,
      ) => ({
        throttlers: [{ ttl: 60000, limit: 120 }],
        ...(config.get('DISTRIBUTED_RATE_LIMIT', { infer: true })
          ? { storage: new RedisThrottlerStorage(redis) }
          : {}),
      }),
    }),
    InfrastructureModule,
    AuthModule,
    UsersModule,
    ShipmentsModule,
    InventoryModule,
    FleetModule,
    DashboardModule,
    SystemHealthModule,
    AlertsModule,
    ReportsModule,
    MessagingModule,
    RoutingModule,
    IntegrationsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
