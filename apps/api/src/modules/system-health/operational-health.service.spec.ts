import { ConfigService } from '@nestjs/config';
import { OperationalHealthService } from './operational-health.service.js';
import type { PrismaService } from '../../infrastructure/database/prisma.service.js';
import type { MongoService } from '../../infrastructure/database/mongo.service.js';
import type { RuntimeEnvironment } from '../../config/environment.js';
describe('Functional health', () => {
  it('distinguishes real module reads, absent providers and local-reference exchanges without leaking connections', async () => {
    const prisma = {
      inventoryItem: { findFirst: vi.fn().mockResolvedValue(null) },
      integrationReceipt: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    const service = new OperationalHealthService(
      prisma as unknown as PrismaService,
      {} as MongoService,
      new ConfigService({
        ROUTING_URL: '',
        ROUTING_HEALTH_PATH: '',
        GPS_INGEST_TOKEN: '',
      }) as ConfigService<RuntimeEnvironment, true>,
    );
    const health = await service.inspect();
    expect(health.components.map((c) => c.status)).toEqual([
      'operational',
      'not-configured',
      'not-configured',
      'unknown',
    ]);
    await service.inspect();
    expect(prisma.inventoryItem.findFirst).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(health)).not.toContain('postgresql://');
  });
  it('contains dependency failures without exposing internal errors', async () => {
    const prisma = {
      inventoryItem: {
        findFirst: vi.fn().mockRejectedValue(new Error('secret connection')),
      },
      integrationReceipt: {
        findFirst: vi.fn().mockResolvedValue({ status: 'accepted' }),
      },
    };
    const service = new OperationalHealthService(
      prisma as unknown as PrismaService,
      {} as MongoService,
      new ConfigService({
        ROUTING_URL: 'http://internal',
        ROUTING_HEALTH_PATH: '',
        GPS_INGEST_TOKEN: '',
      }) as ConfigService<RuntimeEnvironment, true>,
    );
    const health = await service.inspect();
    expect(health.components[0].status).toBe('unavailable');
    expect(health.components[1].status).toBe('unknown');
    expect(JSON.stringify(health)).not.toMatch(/secret|http:\/\/internal/);
  });
  it('bounds hung reads, expires cached failure and recovers without creating writes', async () => {
    vi.useFakeTimers();
    try {
      const read = vi
        .fn()
        .mockImplementationOnce(() => new Promise(() => undefined))
        .mockResolvedValue(null);
      const prisma = {
        inventoryItem: { findFirst: read },
        integrationReceipt: { findFirst: vi.fn().mockResolvedValue(null) },
      };
      const service = new OperationalHealthService(
        prisma as unknown as PrismaService,
        {} as MongoService,
        new ConfigService({
          ROUTING_URL: '',
          ROUTING_HEALTH_PATH: '',
          GPS_INGEST_TOKEN: '',
        }) as ConfigService<RuntimeEnvironment, true>,
      );
      const flight = service.inspect();
      await vi.advanceTimersByTimeAsync(1501);
      expect((await flight).components[0].status).toBe('unavailable');
      await vi.advanceTimersByTimeAsync(15000);
      expect((await service.inspect()).components[0].status).toBe(
        'operational',
      );
      expect(read).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
