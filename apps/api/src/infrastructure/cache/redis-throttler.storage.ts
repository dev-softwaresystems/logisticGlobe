import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import { createHash } from 'node:crypto';
import { RedisService } from './redis.service.js';
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(@Inject(RedisService) private readonly redis: RedisService) {}
  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    name: string,
  ): ReturnType<ThrottlerStorage['increment']> {
    const bucket =
      'throttle:' +
      createHash('sha256')
        .update(name + ':' + key)
        .digest('hex');
    try {
      const result = await this.redis.evaluate(
        `
    local blocked=redis.call('PTTL',KEYS[2])
    if blocked > 0 then return {0,redis.call('PTTL',KEYS[1]),1,blocked} end
    local hits=redis.call('INCR',KEYS[1])
    if hits==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end
    if hits > tonumber(ARGV[2]) then redis.call('SET',KEYS[2],'1','PX',ARGV[3]);return {hits,redis.call('PTTL',KEYS[1]),1,tonumber(ARGV[3])} end
    return {hits,redis.call('PTTL',KEYS[1]),0,0}
   `,
        [bucket, bucket + ':block'],
        [ttl, limit, Math.max(blockDuration, 1)],
      );
      const values = result as number[];
      return {
        totalHits: values[0],
        timeToExpire: Math.max(0, Math.ceil(values[1] / 1000)),
        isBlocked: values[2] === 1,
        timeToBlockExpire: Math.max(0, Math.ceil(values[3] / 1000)),
      };
    } catch {
      throw new ServiceUnavailableException(
        'Rate limiting storage unavailable',
      );
    }
  }
}
