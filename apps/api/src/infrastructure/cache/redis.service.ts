import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import type { RuntimeEnvironment } from '../../config/environment.js';
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  constructor(
    @Inject(ConfigService) config: ConfigService<RuntimeEnvironment, true>,
  ) {
    this.client = new Redis(config.get('REDIS_URL', { infer: true }), {
      lazyConnect: true,
      connectTimeout: 1500,
      commandTimeout: 1500,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      enableOfflineQueue: false,
    });
    this.client.on('error', () => {
      /* Health reports availability without connection details. */
    });
  }
  async ping(): Promise<void> {
    if (this.client.status === 'wait' || this.client.status === 'end')
      await this.client.connect();
    await this.client.ping();
  }
  async set(key: string, value: string, ttl: number) {
    await this.ping();
    return this.client.set(key, value, 'EX', ttl);
  }
  async evaluate(script: string, keys: string[], args: (string | number)[]) {
    await this.ping();
    return this.client.eval(script, keys.length, ...keys, ...args);
  }
  async delete(key: string) {
    await this.ping();
    await this.client.del(key);
  }
  async get(key: string) {
    await this.ping();
    return this.client.get(key);
  }
  async setLatest(
    key: string,
    position: { observedAt: string; id: string },
    ttl: number,
  ) {
    await this.ping();
    await this.client.eval(
      `
      local current = redis.call('GET', KEYS[1])
      if current then
        local old = cjson.decode(current)
        local new = cjson.decode(ARGV[1])
        if old.observedAt > new.observedAt or (old.observedAt == new.observedAt and old.id >= new.id) then return 0 end
      end
      return redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2])
    `,
      1,
      key,
      JSON.stringify(position),
      ttl,
    );
  }
  onModuleDestroy(): void {
    this.client.disconnect();
  }
}
