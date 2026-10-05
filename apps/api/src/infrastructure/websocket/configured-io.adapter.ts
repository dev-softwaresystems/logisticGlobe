import { IoAdapter } from '@nestjs/platform-socket.io';
import type { INestApplicationContext } from '@nestjs/common';
import type { ServerOptions, Server } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
import type { RuntimeEnvironment } from '../../config/environment.js';
export class ConfiguredIoAdapter extends IoAdapter {
  private readonly origin: string;
  private readonly redisUrl: string | undefined;
  private readonly clients: Redis[] = [];
  constructor(app: INestApplicationContext) {
    super(app);
    const config = app.get(ConfigService<RuntimeEnvironment, true>);
    this.origin = config.get('WEB_ORIGIN', { infer: true });
    this.redisUrl = config.get('DISTRIBUTED_REALTIME', { infer: true })
      ? config.get('REDIS_URL', { infer: true })
      : undefined;
  }
  override createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, {
      ...options,
      maxHttpBufferSize: 16384,
      cors: { origin: this.origin, credentials: true },
      allowRequest: (
        req: { headers: { origin?: string } },
        callback: (error: string | null, allowed: boolean) => void,
      ) => {
        callback(
          null,
          !req.headers.origin || req.headers.origin === this.origin,
        );
      },
    } as ServerOptions) as Server;
    if (this.redisUrl) {
      const pub = new Redis(this.redisUrl, {
        connectTimeout: 1500,
        commandTimeout: 2000,
        maxRetriesPerRequest: 1,
      });
      const sub = pub.duplicate();
      for (const client of [pub, sub])
        client.on('error', () => {
          /* Health and event transport report dependency failures. */
        });
      this.clients.push(pub, sub);
      server.adapter(createAdapter(pub, sub));
    }
    return server;
  }
  override async dispose(): Promise<void> {
    for (const client of this.clients) client.disconnect();
    await super.dispose();
  }
}
