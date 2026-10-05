import { randomUUID, randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/config/configure-app.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';
import { MongoService } from '../src/infrastructure/database/mongo.service.js';
import { RedisService } from '../src/infrastructure/cache/redis.service.js';
import { TelemetryRepository } from '../src/fleet/infrastructure/telemetry.repository.js';
describe('Local capacity evidence (500 active shipments and 100 monitored vehicles)', () => {
  let app: INestApplication<App>, prisma: PrismaService, token: string;
  const prefix = 'CAP-' + randomUUID(),
    userId = randomUUID();
  const vehicleIds = Array.from({ length: 100 }, () => randomUUID());
  const shipmentIds = Array.from({ length: 500 }, () => randomUUID());
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication({ logger: false });
    configureApp(app);
    await app.listen(0, '127.0.0.1');
    prisma = app.get(PrismaService);
    const password = randomBytes(24).toString('hex');
    await prisma.role.upsert({
      where: { name: 'ADMIN' },
      create: { name: 'ADMIN' },
      update: {},
    });
    await prisma.user.create({
      data: {
        id: userId,
        email: userId + '@capacity.local',
        name: 'Capacity fixture',
        passwordHash: await bcrypt.hash(password, 12),
        roles: { connect: { name: 'ADMIN' } },
      },
    });
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: userId + '@capacity.local', password })
      .expect(200);
    token = login.body.accessToken as string;
    await prisma.vehicle.createMany({
      data: vehicleIds.map((id, index) => ({
        id,
        plate: prefix + '-' + index,
        status: 'ON_ROUTE' as const,
      })),
    });
    await prisma.shipment.createMany({
      data: shipmentIds.map((id, index) => ({
        id,
        reference: prefix + '-' + index,
        status: 'IN_TRANSIT' as const,
        priority: 'NORMAL' as const,
        origin: 'Capacity origin',
        destination: 'Capacity destination',
        vehicleId: vehicleIds[index % 100],
      })),
    });
  });
  afterAll(async () => {
    if (prisma) {
      await prisma.shipment.deleteMany({ where: { id: { in: shipmentIds } } });
      await prisma.vehicle.deleteMany({ where: { id: { in: vehicleIds } } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    if (app) {
      await (
        await app.get(MongoService).collection('vehicle_telemetry')
      ).deleteMany({ vehicleId: { $in: vehicleIds } });
      for (const id of vehicleIds)
        await app.get(RedisService).delete('fleet:position:' + id);
      await app.close();
    }
  });
  it('serves paginated operations and all 100 latest positions and records measured local request latency', async () => {
    const observedAt = new Date().toISOString();
    const start = performance.now();
    for (let offset = 0; offset < 100; offset += 10) {
      await Promise.all(
        vehicleIds.slice(offset, offset + 10).map((id, index) =>
          request(app.getHttpServer())
            .post('/api/v1/fleet/vehicles/' + id + '/positions')
            .auth(token, { type: 'bearer' })
            .send({
              id: randomUUID(),
              latitude: 19.43 + (offset + index) / 1000,
              longitude: -99.13,
              observedAt,
            })
            .expect(201),
        ),
      );
    }
    const ingestionMs = performance.now() - start;
    const vehicles = await request(app.getHttpServer())
      .get('/api/v1/fleet/vehicles')
      .query({ search: prefix, pageSize: 100 })
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(vehicles.body.total).toBe(100);
    expect(
      vehicles.body.items.every(
        (vehicle: { position: unknown }) => !!vehicle.position,
      ),
    ).toBe(true);
    const shipments = await request(app.getHttpServer())
      .get('/api/v1/shipments')
      .query({ search: prefix, status: 'IN_TRANSIT', pageSize: 100, page: 5 })
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(shipments.body.total).toBe(500);
    expect(shipments.body.items).toHaveLength(100);
    expect(
      await app.get(TelemetryRepository).latest(vehicleIds[99]),
    ).toBeTruthy();
    const latencies: number[] = [];
    for (let batch = 0; batch < 4; batch++) {
      await Promise.all(
        Array.from({ length: 10 }, async () => {
          const began = performance.now();
          const result = await request(app.getHttpServer())
            .get('/api/v1/dashboard/summary')
            .auth(token, { type: 'bearer' })
            .expect(200);
          expect(result.body.activeShipments).toBeGreaterThanOrEqual(500);
          latencies.push(performance.now() - began);
        }),
      );
    }
    latencies.sort((a, b) => a - b);
    const evidence = {
      testedAt: new Date().toISOString(),
      runtime: process.version,
      environment:
        'local integration database; not a production availability or routing benchmark',
      activeShipments: 500,
      vehiclesWithPositions: 100,
      ingestionRequests: 100,
      ingestionConcurrency: 10,
      ingestionMs: Math.round(ingestionMs),
      dashboardRequests: 40,
      dashboardConcurrency: 10,
      latencyMs: {
        p50: Math.round(latencies[19]),
        p95: Math.round(latencies[37]),
        max: Math.round(latencies[39]),
      },
    };
    await mkdir('../../artifacts', { recursive: true });
    await writeFile(
      '../../artifacts/capacity-verification.json',
      JSON.stringify(evidence, null, 2),
    );
    console.log(JSON.stringify(evidence));
  }, 60000);
});
