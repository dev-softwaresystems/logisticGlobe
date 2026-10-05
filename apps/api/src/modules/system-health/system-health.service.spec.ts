import { SystemHealthService } from './system-health.service.js';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { MongoService } from '../../infrastructure/database/mongo.service.js';
import { RedisService } from '../../infrastructure/cache/redis.service.js';
describe('Dependency availability', () => {
  it('returns degraded status without exposing probe errors', async () => {
    const service = new SystemHealthService(
      { $queryRaw: vi.fn().mockResolvedValue([]) } as unknown as PrismaService,
      {
        ping: vi.fn().mockRejectedValue(new Error('sensitive-connection')),
      } as unknown as MongoService,
      { ping: vi.fn().mockResolvedValue(undefined) } as unknown as RedisService,
    );
    const health = await service.services();
    expect(health.status).toBe('degraded');
    expect(
      health.services.find((item) => item.name === 'mongodb')?.status,
    ).toBe('down');
    expect(health.services.find((item) => item.name === 'redis')?.status).toBe(
      'up',
    );
    expect(JSON.stringify(health)).not.toContain('sensitive-connection');
  });
});
