import { randomUUID, randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/config/configure-app.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';
import { MongoService } from '../src/infrastructure/database/mongo.service.js';
import { RedisService } from '../src/infrastructure/cache/redis.service.js';
import { ExecutiveService } from '../src/modules/reports/executive.service.js';
const run = promisify(execFile);
describe('Professional demo dataset and durable map state', () => {
  let app: INestApplication, prisma: PrismaService, token: string;
  const actorId = randomUUID(),
    foreignVehicle = randomUUID(),
    password = randomBytes(24).toString('hex'),
    prefix = 'LGD-V1-';
  const email = actorId + '@demo.test';
  let claimed = false;
  const start = async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication({ logger: false });
    configureApp(app);
    await app.listen(0, '127.0.0.1');
    prisma = app.get(PrismaService);
  };
  beforeAll(async () => {
    await start();
    if (
      (await prisma.auditLog.count({ where: { targetId: prefix } })) ||
      (await prisma.vehicle.count({ where: { plate: { startsWith: prefix } } }))
    )
      throw new Error(
        'Demo test namespace is already occupied; use a clean dedicated test database',
      );
    claimed = true;
    await prisma.role.upsert({
      where: { name: 'ADMIN' },
      create: { name: 'ADMIN' },
      update: {},
    });
    await prisma.user.create({
      data: {
        id: actorId,
        email,
        name: 'Demo test',
        passwordHash: await bcrypt.hash(password, 12),
        roles: { connect: { name: 'ADMIN' } },
      },
    });
    await prisma.vehicle.create({
      data: { id: foreignVehicle, plate: foreignVehicle },
    });
    token = (
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password })
        .expect(200)
    ).body.accessToken as string;
  }, 60000);
  afterAll(async () => {
    if (claimed && prisma) {
      const vehicles = await prisma.vehicle.findMany({
        where: { plate: { startsWith: prefix } },
      });
      const vehicleIds = [...vehicles.map((v) => v.id), foreignVehicle];
      const warehouses = await prisma.warehouse.findMany({
        where: { code: { startsWith: prefix } },
      });
      const items = await prisma.inventoryItem.findMany({
        where: { warehouseId: { in: warehouses.map((w) => w.id) } },
      });
      await prisma.outboxEvent.deleteMany({ where: { actorId } });
      await prisma.shipment.deleteMany({
        where: { reference: { startsWith: prefix } },
      });
      await prisma.inventoryItem.deleteMany({
        where: { id: { in: items.map((i) => i.id) } },
      });
      await prisma.warehouse.deleteMany({
        where: { id: { in: warehouses.map((w) => w.id) } },
      });
      await prisma.vehicle.deleteMany({ where: { id: { in: vehicleIds } } });
      await prisma.auditLog.deleteMany({ where: { actorId } });
      await prisma.user.deleteMany({ where: { id: actorId } });
      await (
        await app.get(MongoService).collection('vehicle_telemetry')
      ).deleteMany({ vehicleId: { $in: vehicleIds } });
      for (const id of vehicleIds)
        await app.get(RedisService).delete('fleet:position:' + id);
    }
    await app?.close();
  }, 60000);
  const command = (mode: string, extra: Record<string, string> = {}) =>
    run(process.execPath, ['demo/run.mjs', mode], {
      cwd: resolve('.'),
      env: {
        ...process.env,
        DEMO_EMAIL: email,
        DEMO_PASSWORD: password,
        ...extra,
      },
      timeout: 90000,
      maxBuffer: 1024 * 1024,
    });
  it('creates coherent namespace data through use cases; re-running preserves every row, history, position and unrelated user', async () => {
    const foreign = await prisma.vehicle.findUnique({
      where: { id: foreignVehicle },
    });
    const user = await prisma.user.findUnique({
      where: { id: actorId },
      include: { roles: true },
    });
    expect((await command('seed')).stdout).toContain('"coherent":true');
    const snapshot = async () =>
      JSON.stringify({
        vehicles: await prisma.vehicle.findMany({
          where: { plate: { startsWith: prefix } },
          orderBy: { id: 'asc' },
        }),
        shipments: await prisma.shipment.findMany({
          where: { reference: { startsWith: prefix } },
          include: { history: { orderBy: { id: 'asc' } } },
          orderBy: { id: 'asc' },
        }),
        stock: await prisma.inventoryItem.findMany({
          where: { sku: { startsWith: prefix } },
          include: {
            movements: { orderBy: { id: 'asc' } },
            alerts: { orderBy: { id: 'asc' } },
          },
          orderBy: { id: 'asc' },
        }),
        gps: await (
          await app.get(MongoService).collection('vehicle_telemetry')
        )
          .find({ actorId })
          .sort({ _id: 1 })
          .toArray(),
      });
    const first = await snapshot();
    expect((await command('seed')).stdout).toContain('"positionedVehicles":18');
    expect(await snapshot()).toBe(first);
    expect(
      await prisma.vehicle.findUnique({ where: { id: foreignVehicle } }),
    ).toEqual(foreign);
    expect(
      await prisma.user.findUnique({
        where: { id: actorId },
        include: { roles: true },
      }),
    ).toEqual(user);
    expect(
      await prisma.vehicle.count({ where: { plate: { startsWith: prefix } } }),
    ).toBe(20);
    expect(
      await prisma.shipment.count({
        where: { reference: { startsWith: prefix } },
      }),
    ).toBe(80);
    const data = await app.get(ExecutiveService).data({});
    const active = await prisma.shipment.count({
      where: { status: 'IN_TRANSIT' },
    });
    expect(data.summary.activeShipments).toBe(active);
    expect(
      data.states.reduce((sum, row) => sum + row.count, 0),
    ).toBeGreaterThanOrEqual(80);
  }, 120000);
  it('simulates through authenticated HTTP, keeps provenance/idempotence and survives API restart and cache loss', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/fleet/vehicles')
      .query({ search: prefix, pageSize: 100 })
      .auth(token, { type: 'bearer' })
      .expect(200);
    const vehicles = response.body.items as {
      id: string;
      position: { source: string; observedAt: string } | null;
    }[];
    expect(vehicles.filter((v) => v.position)).toHaveLength(18);
    expect(vehicles.filter((v) => !v.position)).toHaveLength(2);
    expect(
      vehicles.some(
        (v) =>
          v.position && Date.now() - Date.parse(v.position.observedAt) > 300000,
      ),
    ).toBe(true);
    await command('simulate', {
      DEMO_API_URL: (await app.getUrl()) + '/api/v1',
      DEMO_SECONDS: '6',
      DEMO_INTERVAL_MS: '5000',
    });
    const id = vehicles[0].id;
    const history = await request(app.getHttpServer())
      .get('/api/v1/fleet/vehicles/' + id + '/positions')
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(history.body.items[0].source).toBe('simulated');
    const manualId = randomUUID();
    const body = {
      id: manualId,
      latitude: 19.43,
      longitude: -99.12,
      observedAt: new Date().toISOString(),
      speedKph: 30,
      headingDegrees: 90,
      accuracyMeters: 12,
    };
    const first = await request(app.getHttpServer())
      .post('/api/v1/fleet/vehicles/' + id + '/positions')
      .auth(token, { type: 'bearer' })
      .send(body)
      .expect(201);
    expect(first.body.source).toBe('manual');
    expect(first.body).not.toHaveProperty('actorId');
    await request(app.getHttpServer())
      .post('/api/v1/fleet/vehicles/' + id + '/positions')
      .auth(token, { type: 'bearer' })
      .send(body)
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/fleet/vehicles/' + id + '/positions')
      .auth(token, { type: 'bearer' })
      .send({ ...body, speedKph: 31 })
      .expect(409);
    await app.get(RedisService).delete('fleet:position:' + id);
    await app.close();
    await start();
    const recovered = await request(app.getHttpServer())
      .get('/api/v1/fleet/vehicles/' + id)
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(recovered.body.position.id).toBe(manualId);
    expect(recovered.body.position.speedKph).toBe(30);
    expect(
      await (
        await app.get(MongoService).collection('vehicle_telemetry')
      ).countDocuments({ id: manualId }),
    ).toBe(1);
  }, 120000);
});
