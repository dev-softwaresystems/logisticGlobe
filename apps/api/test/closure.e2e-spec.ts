import { randomUUID, randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'node:http';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Response as TestResponse } from 'supertest';
import bcrypt from 'bcrypt';
import { readSheet } from 'read-excel-file/node';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/config/configure-app.js';
import { validateEnvironment } from '../src/config/environment.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';
import { MongoService } from '../src/infrastructure/database/mongo.service.js';
import { RedisService } from '../src/infrastructure/cache/redis.service.js';
import { MonitoringService } from '../src/modules/routing/monitoring.service.js';
import { TelemetryReconciler } from '../src/fleet/infrastructure/telemetry-reconciler.js';
import { dailyCuts } from '../src/modules/dashboard/domain/daily-comparison.js';
describe('Integral closure against isolated persistence', () => {
  const prefix = 'closure-' + randomUUID(),
    vehicleId = randomUUID(),
    userId = randomUUID(),
    viewerId = randomUUID(),
    warehouseId = randomUUID(),
    itemId = randomUUID(),
    shipmentId = randomUUID();
  const password = randomBytes(24).toString('hex'),
    gpsToken = randomBytes(32).toString('hex');
  const apps: INestApplication[] = [];
  let prisma: PrismaService, token: string, viewer: string;
  const provider = createServer((_req, res) =>
    res.writeHead(200, { 'content-type': 'application/json' }).end(
      JSON.stringify({
        code: 'Ok',
        routes: [
          {
            distance: 1000,
            duration: 100,
            geometry: {
              type: 'LineString',
              coordinates: [
                [0, 0],
                [0.1, 0],
              ],
            },
          },
        ],
      }),
    ),
  );
  const api = (index = 0) => request(apps[index].getHttpServer());
  beforeAll(async () => {
    await new Promise<void>((yes) => provider.listen(0, '127.0.0.1', yes));
    const address = provider.address();
    if (!address || typeof address === 'string') throw Error('Fixture address');
    const config = validateEnvironment({
      ...process.env,
      ROUTING_URL: 'http://127.0.0.1:' + address.port,
      GPS_INGEST_TOKEN: gpsToken,
      GPS_ALLOWED_VEHICLE_IDS: vehicleId,
      OPERATION_TIME_ZONE: 'Etc/GMT+8',
    });
    for (let index = 0; index < 2; index++) {
      const module = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(ConfigService)
        .useValue(new ConfigService(config))
        .compile();
      const app = module.createNestApplication({ logger: false });
      configureApp(app);
      await app.listen(0, '127.0.0.1');
      apps.push(app);
      app.get(TelemetryReconciler).onModuleDestroy(); // Deterministic failure/replay injection; explicit processors still exercised.
    }
    prisma = apps[0].get(PrismaService);
    for (const role of ['ADMIN', 'VIEWER'] as const)
      await prisma.role.upsert({
        where: { name: role },
        update: {},
        create: { name: role },
      });
    for (const [id, role] of [
      [userId, 'ADMIN'],
      [viewerId, 'VIEWER'],
    ] as const)
      await prisma.user.create({
        data: {
          id,
          email: id + '@closure.test',
          name: 'Synthetic closure',
          passwordHash: await bcrypt.hash(password, 12),
          roles: { connect: { name: role } },
        },
      });
    await prisma.vehicle.create({
      data: { id: vehicleId, plate: prefix, status: 'ON_ROUTE' },
    });
    await prisma.warehouse.create({
      data: {
        id: warehouseId,
        code: prefix,
        name: 'Almacén de prueba áéíóú',
        capacityUnits: 100,
      },
    });
    await prisma.inventoryItem.create({
      data: {
        id: itemId,
        sku: prefix,
        name: 'Artículo sintético',
        quantity: 20,
        warehouseId,
        threshold: { create: { minimumQuantity: 10 } },
      },
    });
    await prisma.shipment.create({
      data: {
        id: shipmentId,
        reference: prefix,
        origin: 'Fixture',
        destination: 'Fixture',
        status: 'IN_TRANSIT',
        vehicleId,
      },
    });
    token = (
      await api()
        .post('/api/v1/auth/login')
        .send({ email: userId + '@closure.test', password })
        .expect(200)
    ).body.accessToken as string;
    viewer = (
      await api()
        .post('/api/v1/auth/login')
        .send({ email: viewerId + '@closure.test', password })
        .expect(200)
    ).body.accessToken as string;
  }, 60000);
  afterAll(async () => {
    if (prisma) {
      const plans = await prisma.routePlan.findMany({ where: { vehicleId } }),
        incidents = await prisma.routeIncident.findMany({
          where: { planId: { in: plans.map((p) => p.id) } },
        });
      const owned = [
        vehicleId,
        userId,
        viewerId,
        itemId,
        warehouseId,
        shipmentId,
        ...plans.map((p) => p.id),
        ...incidents.map((i) => i.id),
      ];
      const outbox = await prisma.outboxEvent.findMany();
      await prisma.outboxEvent.deleteMany({
        where: {
          id: {
            in: outbox
              .filter((e) =>
                owned.some((id) => JSON.stringify(e.body).includes(id)),
              )
              .map((e) => e.id),
          },
        },
      });
      await prisma.integrationReceipt.deleteMany({
        where: { actorId: userId },
      });
      await prisma.shipment.deleteMany({ where: { id: shipmentId } });
      await prisma.inventoryItem.deleteMany({ where: { id: itemId } });
      await prisma.warehouse.deleteMany({ where: { id: warehouseId } });
      await prisma.vehicle.deleteMany({ where: { id: vehicleId } });
      await prisma.user.deleteMany({
        where: { id: { in: [userId, viewerId] } },
      });
      await (
        await apps[0].get(MongoService).collection('vehicle_telemetry')
      ).deleteMany({ vehicleId });
      await apps[0].get(RedisService).delete('fleet:position:' + vehicleId);
      await apps[0].get(RedisService).delete('monitoring:' + vehicleId);
    }
    for (const app of apps) await app.close();
    await new Promise<void>((yes) => provider.close(() => yes()));
  }, 30000);
  it('uses observed daily cuts and preserves weekly creation semantics', async () => {
    const body = (
      await api()
        .get('/api/v1/dashboard/summary')
        .auth(token, { type: 'bearer' })
        .expect(200)
    ).body;
    expect(body.dailyActiveComparison.timeZone).toBe('Etc/GMT+8');
    expect(body.dailyActiveComparison.reason).toBe('missing-history');
    expect(body.dailyActiveComparison.percent).toBeNull();
    const cuts = dailyCuts(new Date(), 'Etc/GMT+8');
    expect(
      await prisma.dashboardSnapshot.count({
        where: { timeZone: 'Etc/GMT+8', cutAt: cuts.current },
      }),
    ).toBe(1);
  });
  it('imports through stock rules with row outcomes, replay, conflicts and alert resolution', async () => {
    const observedAt = new Date().toISOString();
    const item = await prisma.inventoryItem.findUniqueOrThrow({
      where: { id: itemId },
    });
    const row = {
      externalId: prefix,
      version: 1,
      observedAt,
      warehouseCode: prefix,
      sku: prefix,
      quantity: 1,
      minimumQuantity: 10,
      expectedUpdatedAt: item.updatedAt.toISOString(),
    };
    await api()
      .post('/api/v1/integrations/reference/stock')
      .auth(viewer, { type: 'bearer' })
      .send({ records: [row] })
      .expect(403);
    const response = await api()
      .post('/api/v1/integrations/reference/stock')
      .auth(token, { type: 'bearer' })
      .send({
        records: [
          row,
          { ...row, externalId: prefix + '-missing', sku: 'unknown' },
          { ...row, externalId: prefix + '-bad', quantity: -1 },
        ],
      })
      .expect(201);
    expect(
      response.body.results.map((r: { status: string }) => r.status),
    ).toEqual(['accepted', 'invalid', 'invalid']);
    expect(await prisma.inventoryMovement.count({ where: { itemId } })).toBe(1);
    expect(
      await prisma.inventoryAlert.count({
        where: { itemId, resolvedAt: null },
      }),
    ).toBe(1);
    const duplicate = await api(1)
      .post('/api/v1/integrations/reference/stock')
      .auth(token, { type: 'bearer' })
      .send({ records: [row, { ...row, quantity: 2 }] })
      .expect(201);
    expect(
      duplicate.body.results.map((r: { status: string }) => r.status),
    ).toEqual(['duplicate', 'conflict']);
    const updated = await prisma.inventoryItem.findUniqueOrThrow({
      where: { id: itemId },
    });
    const next = {
      ...row,
      version: 2,
      quantity: 15,
      expectedUpdatedAt: updated.updatedAt.toISOString(),
      observedAt: new Date().toISOString(),
    };
    const accepted = await api()
      .post('/api/v1/integrations/reference/stock')
      .auth(token, { type: 'bearer' })
      .send({ records: [next, { ...next, version: 0 }] })
      .expect(201);
    expect(
      accepted.body.results.map((r: { status: string }) => r.status),
    ).toEqual(['accepted', 'invalid']);
    expect(
      await prisma.inventoryAlert.count({
        where: { itemId, resolvedAt: null },
      }),
    ).toBe(0);
    expect(await prisma.inventoryMovement.count({ where: { itemId } })).toBe(2);
    const stale = await api()
      .post('/api/v1/integrations/reference/stock')
      .auth(token, { type: 'bearer' })
      .send({
        records: [
          { ...next, version: 1 },
          { ...next, version: 3, expectedUpdatedAt: new Date(0).toISOString() },
          {
            ...next,
            externalId: prefix + '-warehouse',
            warehouseCode: 'unknown',
          },
        ],
      })
      .expect(201);
    expect(stale.body.results.map((r: { status: string }) => r.status)).toEqual(
      ['conflict', 'conflict', 'invalid'],
    );
    const csv =
      'externalId,version,observedAt,warehouseCode,sku,quantity,minimumQuantity,expectedUpdatedAt\n' +
      [
        row.externalId,
        row.version,
        row.observedAt,
        row.warehouseCode,
        row.sku,
        row.quantity,
        row.minimumQuantity,
        row.expectedUpdatedAt,
      ].join(',');
    const imported = await api()
      .post('/api/v1/integrations/reference/stock.csv')
      .auth(token, { type: 'bearer' })
      .send({ csv })
      .expect(201);
    expect(imported.body.results[0].status).toBe('duplicate');
  });
  it('assigns versioned routes and rejects unauthorized or mismatched replay', async () => {
    const plan = {
      requestId: randomUUID(),
      vehicleId,
      shipmentIds: [shipmentId],
      origin: { latitude: 0, longitude: 0 },
      destination: { latitude: 0, longitude: 0.1 },
      corridorMeters: 200,
      confirmSeconds: 30,
      confirmObservations: 3,
      stopRadiusMeters: 30,
      stopSeconds: 121,
      maxGapSeconds: 60,
      maxAccuracyMeters: 100,
      authorizedStops: [],
    };
    await api()
      .post('/api/v1/routing/plans')
      .auth(viewer, { type: 'bearer' })
      .send(plan)
      .expect(403);
    const first = await api()
      .post('/api/v1/routing/plans')
      .auth(token, { type: 'bearer' })
      .send(plan)
      .expect(201);
    const replay = await api(1)
      .post('/api/v1/routing/plans')
      .auth(token, { type: 'bearer' })
      .send(plan)
      .expect(201);
    expect(replay.body.id).toBe(first.body.id);
    await api()
      .post('/api/v1/routing/plans')
      .auth(token, { type: 'bearer' })
      .send({ ...plan, corridorMeters: 201 })
      .expect(409);
    // Historical fixture starts after effective cut; direct clock advance avoids waiting minutes.
    const at = Date.now() - 70000;
    await prisma.routePlan.update({
      where: { id: first.body.id as string },
      data: { effectiveAt: new Date(at - 1000) },
    });
    const points = [0, 20, 40].map((seconds) => ({
      id: randomUUID(),
      vehicleId,
      latitude: 0.01,
      longitude: 0.05,
      observedAt: new Date(at + seconds * 1000).toISOString(),
      receivedAt: new Date().toISOString(),
      accuracyMeters: 5,
    }));
    await apps[0].get(MonitoringService).evaluate(points[0]);
    await apps[1].get(MonitoringService).evaluate(points[1]);
    await Promise.all(
      apps.map((app) => app.get(MonitoringService).evaluate(points[2])),
    );
    const incidents = await prisma.routeIncident.findMany({
      where: { planId: first.body.id as string, kind: 'DEVIATION' },
      include: { history: true },
    });
    expect(incidents).toHaveLength(1);
    expect(incidents[0].history).toHaveLength(1);
    await api()
      .post('/api/v1/routing/incidents/' + incidents[0].id + '/acknowledge')
      .auth(viewer, { type: 'bearer' })
      .send({
        expectedLastObservedAt: incidents[0].lastObservedAt.toISOString(),
        note: 'Fixture review',
      })
      .expect(403);
    await api()
      .post('/api/v1/routing/incidents/' + incidents[0].id + '/acknowledge')
      .auth(token, { type: 'bearer' })
      .send({
        expectedLastObservedAt: new Date(0).toISOString(),
        note: 'Fixture review',
      })
      .expect(409);
    await api()
      .post('/api/v1/routing/incidents/' + incidents[0].id + '/acknowledge')
      .auth(token, { type: 'bearer' })
      .send({
        expectedLastObservedAt: incidents[0].lastObservedAt.toISOString(),
        note: 'Fixture review',
      })
      .expect(201);
    const second = await api()
      .post('/api/v1/routing/plans')
      .auth(token, { type: 'bearer' })
      .send({ ...plan, requestId: randomUUID() })
      .expect(201);
    expect(second.body.version).toBe(2);
    expect(
      (
        await prisma.routeIncident.findUniqueOrThrow({
          where: { id: incidents[0].id },
        })
      ).resolvedAt,
    ).not.toBeNull();
  });
  it('reconciles Mongo durability after a partial SQL failure and duplicate GPS replay', async () => {
    const monitoring = apps[0].get(MonitoringService),
      failure = vi
        .spyOn(monitoring, 'evaluate')
        .mockRejectedValueOnce(new Error('injected SQL failure'));
    const point = {
      id: randomUUID(),
      vehicleId,
      latitude: 0,
      longitude: 0.05,
      observedAt: new Date().toISOString(),
      accuracyMeters: 5,
    };
    await api()
      .post('/api/v1/integrations/gps/positions')
      .auth(gpsToken, { type: 'bearer' })
      .send(point)
      .expect(503);
    failure.mockRestore();
    const collection = await apps[0]
      .get(MongoService)
      .collection<{ _id: string; monitoringPending?: boolean }>(
        'vehicle_telemetry',
      );
    expect(
      (await collection.findOne({ _id: point.id }))?.monitoringPending,
    ).toBe(true);
    await api(1)
      .post('/api/v1/integrations/gps/positions')
      .auth(gpsToken, { type: 'bearer' })
      .send(point)
      .expect(201);
    expect(
      (await collection.findOne({ _id: point.id }))?.monitoringPending,
    ).toBe(false);
    expect(await collection.countDocuments({ _id: point.id })).toBe(1);
  });
  it('exports valid PDF/XLSX with typed metrics, safe Spanish strings, empty ranges and safe health', async () => {
    await api().get('/api/v1/reports/dashboard.pdf').expect(401);
    const json = await api()
      .get('/api/v1/reports/dashboard')
      .auth(token, { type: 'bearer' })
      .expect(200);
    const pdf = await api()
      .get('/api/v1/reports/dashboard.pdf')
      .auth(viewer, { type: 'bearer' })
      .buffer()
      .expect(200);
    expect((pdf.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.headers['cache-control']).toBe('no-store');
    const binary = (
      res: TestResponse,
      callback: (error: Error | null, body: Buffer) => void,
    ) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => callback(null, Buffer.concat(chunks)));
      res.on('error', (error: Error) => callback(error, Buffer.alloc(0)));
    };
    const xlsx = await api()
      .get('/api/v1/reports/dashboard.xlsx')
      .auth(viewer, { type: 'bearer' })
      .buffer()
      .parse(binary)
      .expect(200);
    const metrics = await readSheet(xlsx.body as Buffer, 2);
    expect(metrics[1]).toEqual([
      'Envíos activos',
      json.body.summary.activeShipments,
    ]);
    expect(typeof metrics[1][1]).toBe('number');
    const info = await readSheet(xlsx.body as Buffer, 1);
    expect(info[2][1]).toBeInstanceOf(Date);
    await api()
      .get('/api/v1/reports/dashboard.xlsx')
      .query({
        from: '2020-01-01T00:00:00Z',
        to: '2020-01-02T00:00:00Z',
        status: 'DELIVERED',
      })
      .auth(token, { type: 'bearer' })
      .expect(200);
    await api()
      .get('/api/v1/reports/dashboard')
      .query({ from: '2020-01-01T00:00:00Z' })
      .auth(token, { type: 'bearer' })
      .expect(400);
    const health = await api()
      .get('/api/v1/health/operations')
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(JSON.stringify(health.body)).not.toMatch(
      /mongodb:\/\/|postgresql:\/\/|127\.0\.0\.1|passwordHash/,
    );
    expect(
      health.body.components.find(
        (c: { name: string }) => c.name === 'inventory-module',
      ).status,
    ).toBe('operational');
    const dir = resolve('../../artifacts/closure');
    await mkdir(dir, { recursive: true });
    await writeFile(resolve(dir, 'executive.pdf'), pdf.body as Buffer);
    await writeFile(resolve(dir, 'executive.xlsx'), xlsx.body as Buffer);
  });
});
