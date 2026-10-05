import { randomUUID, randomBytes } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import type {
  ClientEvents,
  LogisticsEvent,
  ServerEvents,
} from '@logistics-globe/shared';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/config/configure-app.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';
import { MongoService } from '../src/infrastructure/database/mongo.service.js';
import { RedisService } from '../src/infrastructure/cache/redis.service.js';
import { LocalEventBus } from '../src/infrastructure/messaging/event-bus.js';
import { OutboxDispatcher } from '../src/infrastructure/messaging/outbox.js';
import { TelemetryRepository } from '../src/fleet/infrastructure/telemetry.repository.js';

describe('Operational MVP with real PostgreSQL, MongoDB, Redis and Socket.IO', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let token: string;
  let viewerToken: string;
  let cookie: string;
  let shipmentId: string;
  let shipmentUpdatedAt: string;
  let itemId: string;
  let itemUpdatedAt: string;
  const userId = randomUUID(),
    viewerId = randomUUID(),
    warehouseId = randomUUID(),
    vehicleId = randomUUID(),
    maintenanceId = randomUUID();
  const reference = 'E2E-' + randomUUID();
  const itemSku = 'E2E-' + randomUUID();
  const observations: string[] = [];
  const shipmentIds: string[] = [];
  const outboxIds: string[] = [];
  const createdVehicles: string[] = [];
  const createdWarehouses: string[] = [];
  let socket: Socket<ServerEvents, ClientEvents> | undefined;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication({ logger: false });
    configureApp(app);
    await app.listen(0, '127.0.0.1');
    prisma = app.get(PrismaService);
    const password = randomBytes(24).toString('hex');
    for (const name of ['ADMIN', 'VIEWER'] as const)
      await prisma.role.upsert({
        where: { name },
        create: { name },
        update: {},
      });
    for (const [id, role] of [
      [userId, 'ADMIN'],
      [viewerId, 'VIEWER'],
    ] as const)
      await prisma.user.create({
        data: {
          id,
          email: id + '@test.local',
          name: 'MVP test',
          passwordHash: await bcrypt.hash(password, 12),
          roles: { connect: { name: role } },
        },
      });
    const admin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: userId + '@test.local', password })
      .expect(200);
    token = admin.body.accessToken as string;
    cookie = (admin.headers['set-cookie'] as unknown as string[])[0].split(
      ';',
    )[0];
    const viewer = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: viewerId + '@test.local', password })
      .expect(200);
    viewerToken = viewer.body.accessToken as string;
    await prisma.warehouse.create({
      data: {
        id: warehouseId,
        code: warehouseId,
        name: 'MVP test warehouse',
        capacityUnits: 1000,
      },
    });
    await prisma.vehicle.createMany({
      data: [
        { id: vehicleId, plate: vehicleId },
        { id: maintenanceId, plate: maintenanceId, status: 'MAINTENANCE' },
      ],
    });
  });
  afterAll(async () => {
    socket?.disconnect();
    if (prisma) {
      const events = await prisma.outboxEvent.findMany();
      for (const event of events) {
        const body = event.body as unknown as LogisticsEvent;
        if (
          ('shipmentId' in body.payload &&
            shipmentIds.includes(body.payload.shipmentId)) ||
          ('itemId' in body.payload && body.payload.itemId === itemId) ||
          ('vehicleId' in body.payload &&
            (
              [vehicleId, maintenanceId, ...createdVehicles] as string[]
            ).includes(body.payload.vehicleId)) ||
          ('warehouseId' in body.payload &&
            createdWarehouses.includes(body.payload.warehouseId))
        )
          outboxIds.push(event.id);
      }
      await prisma.outboxEvent.deleteMany({ where: { id: { in: outboxIds } } });
      await prisma.shipment.deleteMany({ where: { id: { in: shipmentIds } } });
      await prisma.inventoryItem.deleteMany({
        where: { id: itemId ?? '__absent__' },
      });
      await prisma.warehouse.deleteMany({
        where: { id: { in: [warehouseId, ...createdWarehouses] } },
      });
      await prisma.vehicle.deleteMany({
        where: { id: { in: [vehicleId, maintenanceId, ...createdVehicles] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [userId, viewerId] } },
      });
    }
    if (app) {
      const collection = await app
        .get(MongoService)
        .collection('vehicle_telemetry');
      await collection.deleteMany({ vehicleId });
      await app.close();
    }
  });
  const authorized = () => request(app.getHttpServer());
  it('rejects operational endpoints without authentication and rejects viewer writes', async () => {
    await authorized().get('/api/v1/shipments').expect(401);
    await authorized().get('/api/v1/fleet/vehicles').expect(401);
    await authorized().get('/api/v1/inventory').expect(401);
    await authorized()
      .post('/api/v1/shipments')
      .auth(viewerToken, { type: 'bearer' })
      .send({
        reference,
        origin: 'México',
        destination: 'Puebla',
        priority: 'HIGH',
      })
      .expect(403);
    await authorized()
      .post('/api/v1/fleet/vehicles')
      .auth(viewerToken, { type: 'bearer' })
      .send({ plate: 'WRONG' })
      .expect(403);
    await authorized()
      .post('/api/v1/inventory')
      .auth(viewerToken, { type: 'bearer' })
      .send({})
      .expect(403);
  });
  it('creates normalized vehicles and warehouses with internal actor traceability', async () => {
    const plate = 'v-' + randomUUID().slice(0, 8);
    const vehicle = await authorized()
      .post('/api/v1/fleet/vehicles')
      .auth(token, { type: 'bearer' })
      .send({ plate: '  ' + plate + '  ' })
      .expect(201);
    createdVehicles.push(vehicle.body.id as string);
    expect(vehicle.body.plate).toBe(plate.toUpperCase());
    const warehouse = await authorized()
      .post('/api/v1/inventory/warehouses')
      .auth(token, { type: 'bearer' })
      .send({
        code: randomUUID(),
        name: '  Test warehouse  ',
        capacityUnits: 100,
      })
      .expect(201);
    createdWarehouses.push(warehouse.body.id as string);
    expect(warehouse.body.name).toBe('Test warehouse');
    for (const [field, id] of [
      ['vehicleId', vehicle.body.id as string],
      ['warehouseId', warehouse.body.id as string],
    ]) {
      const event = await prisma.outboxEvent.findFirstOrThrow({
        where: { body: { path: ['payload', field], equals: id } },
      });
      expect(event.actorId).toBe(userId);
      expect(
        (event.body as unknown as LogisticsEvent).payload,
      ).not.toHaveProperty('actorId');
    }
  });
  it('validates pagination, unknown fields, UUIDs and explicit filters', async () => {
    await authorized()
      .get('/api/v1/shipments?pageSize=1000')
      .auth(token, { type: 'bearer' })
      .expect(400);
    await authorized()
      .get('/api/v1/shipments?unknown=true')
      .auth(token, { type: 'bearer' })
      .expect(400);
    await authorized()
      .get('/api/v1/shipments/not-a-uuid')
      .auth(token, { type: 'bearer' })
      .expect(400);
    await authorized()
      .get('/api/v1/shipments?status=FAKE')
      .auth(token, { type: 'bearer' })
      .expect(400);
    await authorized()
      .get('/api/v1/shipments?from=2026-10-02&to=2026-09-01')
      .auth(token, { type: 'bearer' })
      .expect(400);
  });
  it('creates idempotently by reference and records the initial history and outbox atomically', async () => {
    const body = {
      reference,
      origin: 'México',
      destination: 'Puebla',
      priority: 'HIGH',
      vehicleId,
    };
    const response = await authorized()
      .post('/api/v1/shipments')
      .auth(token, { type: 'bearer' })
      .send(body)
      .expect(201);
    shipmentId = response.body.id as string;
    shipmentIds.push(shipmentId);
    shipmentUpdatedAt = response.body.updatedAt as string;
    const repeated = await authorized()
      .post('/api/v1/shipments')
      .auth(token, { type: 'bearer' })
      .send(body)
      .expect(201);
    expect(repeated.body.id).toBe(shipmentId);
    await authorized()
      .post('/api/v1/shipments')
      .auth(token, { type: 'bearer' })
      .send({ ...body, destination: 'Different' })
      .expect(409);
    expect(
      await prisma.shipmentStatusHistory.count({ where: { shipmentId } }),
    ).toBe(1);
    expect(
      await prisma.outboxEvent.count({
        where: {
          body: { path: ['payload', 'shipmentId'], equals: shipmentId },
        },
      }),
    ).toBe(1);
  });
  it('lists with filters, pagination and detail without exposing actor identifiers', async () => {
    const response = await authorized()
      .get('/api/v1/shipments')
      .query({
        search: reference,
        pageSize: 1,
        status: 'PENDING',
        priority: 'HIGH',
      })
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(response.body.total).toBe(1);
    expect(response.body.items[0].id).toBe(shipmentId);
    const detail = await authorized()
      .get('/api/v1/shipments/' + shipmentId)
      .auth(viewerToken, { type: 'bearer' })
      .expect(200);
    expect(detail.body.history).toHaveLength(1);
    expect(detail.body.history[0]).not.toHaveProperty('actorId');
  });
  it('prevents invalid transitions, stale writes and maintenance assignment', async () => {
    await authorized()
      .patch('/api/v1/shipments/' + shipmentId + '/status')
      .auth(token, { type: 'bearer' })
      .send({ status: 'DELIVERED', expectedUpdatedAt: shipmentUpdatedAt })
      .expect(409);
    await authorized()
      .patch('/api/v1/shipments/' + shipmentId + '/status')
      .auth(token, { type: 'bearer' })
      .send({
        status: 'IN_TRANSIT',
        expectedUpdatedAt: new Date(0).toISOString(),
      })
      .expect(409);
    await authorized()
      .patch('/api/v1/shipments/' + shipmentId + '/status')
      .auth(token, { type: 'bearer' })
      .send({
        status: 'IN_TRANSIT',
        vehicleId: maintenanceId,
        expectedUpdatedAt: shipmentUpdatedAt,
      })
      .expect(409);
    expect(
      await prisma.shipmentStatusHistory.count({ where: { shipmentId } }),
    ).toBe(1);
  });
  it('starts transit, prevents maintenance during transit, delivers and releases the vehicle', async () => {
    const started = await authorized()
      .patch('/api/v1/shipments/' + shipmentId + '/status')
      .auth(token, { type: 'bearer' })
      .send({ status: 'IN_TRANSIT', expectedUpdatedAt: shipmentUpdatedAt })
      .expect(200);
    const vehicle = await prisma.vehicle.findUniqueOrThrow({
      where: { id: vehicleId },
    });
    expect(vehicle.status).toBe('ON_ROUTE');
    await authorized()
      .patch('/api/v1/fleet/vehicles/' + vehicleId)
      .auth(token, { type: 'bearer' })
      .send({
        status: 'MAINTENANCE',
        expectedUpdatedAt: vehicle.updatedAt.toISOString(),
      })
      .expect(409);
    await authorized()
      .patch('/api/v1/shipments/' + shipmentId + '/status')
      .auth(token, { type: 'bearer' })
      .send({ status: 'DELIVERED', expectedUpdatedAt: started.body.updatedAt })
      .expect(200);
    expect(
      (await prisma.vehicle.findUniqueOrThrow({ where: { id: vehicleId } }))
        .status,
    ).toBe('AVAILABLE');
    expect(
      await prisma.shipmentStatusHistory.count({ where: { shipmentId } }),
    ).toBe(3);
  });
  it('creates critical inventory, automatically opens an alert and records an adjustment', async () => {
    const response = await authorized()
      .post('/api/v1/inventory')
      .auth(token, { type: 'bearer' })
      .send({
        warehouseId,
        sku: itemSku,
        name: 'MVP item',
        quantity: 5,
        minimumQuantity: 10,
      })
      .expect(201);
    itemId = response.body.id as string;
    itemUpdatedAt = response.body.updatedAt as string;
    expect(
      await prisma.inventoryAlert.count({
        where: { itemId, resolvedAt: null },
      }),
    ).toBe(1);
    expect(await prisma.inventoryMovement.count({ where: { itemId } })).toBe(1);
    const alerts = await authorized()
      .get('/api/v1/inventory/alerts')
      .query({ warehouseId, state: 'open' })
      .auth(viewerToken, { type: 'bearer' })
      .expect(200);
    expect(
      alerts.body.items.some(
        (entry: { item: { id: string } }) => entry.item.id === itemId,
      ),
    ).toBe(true);
  });
  it('does not duplicate an alert, resolves on restock, and reopens for a new breach', async () => {
    const adjust = (quantity: number, expectedUpdatedAt: string) =>
      authorized()
        .patch('/api/v1/inventory/' + itemId)
        .auth(token, { type: 'bearer' })
        .send({
          quantity,
          minimumQuantity: 10,
          reason: 'Test adjustment',
          expectedUpdatedAt,
        });
    const low = await adjust(4, itemUpdatedAt).expect(200);
    expect(
      await prisma.inventoryAlert.count({
        where: { itemId, resolvedAt: null },
      }),
    ).toBe(1);
    const restock = await adjust(10, low.body.updatedAt as string).expect(200);
    expect(
      await prisma.inventoryAlert.count({
        where: { itemId, resolvedAt: null },
      }),
    ).toBe(0);
    const breached = await adjust(2, restock.body.updatedAt as string).expect(
      200,
    );
    itemUpdatedAt = breached.body.updatedAt as string;
    expect(await prisma.inventoryAlert.count({ where: { itemId } })).toBe(2);
    await adjust(20, restock.body.updatedAt as string).expect(409);
    const history = await authorized()
      .get('/api/v1/inventory/' + itemId + '/movements')
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(history.body.total).toBe(4);
    expect(history.body.items[0]).not.toHaveProperty('actorId');
  });
  it('allows only one of two concurrent stock edits and never loses the accepted adjustment', async () => {
    const edits = await Promise.all(
      [1, 3].map((quantity) =>
        authorized()
          .patch('/api/v1/inventory/' + itemId)
          .auth(token, { type: 'bearer' })
          .send({
            quantity,
            minimumQuantity: 10,
            reason: 'Concurrent test',
            expectedUpdatedAt: itemUpdatedAt,
          }),
      ),
    );
    expect(edits.map((e) => e.status).sort((a, b) => a - b)).toEqual([
      200, 409,
    ]);
    expect(await prisma.inventoryMovement.count({ where: { itemId } })).toBe(5);
  });
  it('rejects invalid GPS coordinates and future observations', async () => {
    await authorized()
      .post('/api/v1/fleet/vehicles/' + vehicleId + '/positions')
      .auth(token, { type: 'bearer' })
      .send({
        id: randomUUID(),
        latitude: 91,
        longitude: -99,
        observedAt: new Date().toISOString(),
      })
      .expect(400);
    await authorized()
      .post('/api/v1/fleet/vehicles/' + vehicleId + '/positions')
      .auth(token, { type: 'bearer' })
      .send({
        id: randomUUID(),
        latitude: 19,
        longitude: -99,
        observedAt: new Date(Date.now() + 3600000).toISOString(),
      })
      .expect(400);
  });
  it('persists GPS history idempotently and never replaces a newer position with an older observation', async () => {
    const now = new Date().toISOString();
    const newer = {
      id: randomUUID(),
      latitude: 19.43,
      longitude: -99.13,
      observedAt: now,
    };
    observations.push(newer.id);
    await authorized()
      .post('/api/v1/fleet/vehicles/' + vehicleId + '/positions')
      .auth(token, { type: 'bearer' })
      .send(newer)
      .expect(201);
    await authorized()
      .post('/api/v1/fleet/vehicles/' + vehicleId + '/positions')
      .auth(token, { type: 'bearer' })
      .send(newer)
      .expect(201);
    await authorized()
      .post('/api/v1/fleet/vehicles/' + vehicleId + '/positions')
      .auth(token, { type: 'bearer' })
      .send({ ...newer, latitude: 20 })
      .expect(409);
    const older = {
      ...newer,
      id: randomUUID(),
      latitude: 18,
      observedAt: new Date(Date.now() - 3600000).toISOString(),
    };
    observations.push(older.id);
    await authorized()
      .post('/api/v1/fleet/vehicles/' + vehicleId + '/positions')
      .auth(token, { type: 'bearer' })
      .send(older)
      .expect(201);
    const vehicle = await authorized()
      .get('/api/v1/fleet/vehicles/' + vehicleId)
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(vehicle.body.position.id).toBe(newer.id);
    const history = await authorized()
      .get('/api/v1/fleet/vehicles/' + vehicleId + '/positions')
      .query({ pageSize: 1 })
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(history.body.total).toBe(2);
    expect(history.body.items[0].id).toBe(newer.id);
  });
  it('reads the latest durable position when Redis is unavailable', async () => {
    const spy = vi
      .spyOn(app.get(RedisService), 'get')
      .mockRejectedValueOnce(new Error('Cache down'));
    const position = await app.get(TelemetryRepository).latest(vehicleId);
    expect(position?.id).toBe(observations[0]);
    spy.mockRestore();
  });
  it('rejects unauthorized WebSocket connections and connections from another origin', async () => {
    const url = await app.getUrl();
    for (const options of [
      { auth: { token: 'invalid' } },
      { auth: { token }, extraHeaders: { Origin: 'https://foreign.example' } },
    ]) {
      const invalid = io(url + '/operations', {
        ...options,
        transports: ['websocket'],
        reconnection: false,
      });
      await new Promise<void>((resolve, reject) => {
        invalid.once('connect_error', () => {
          invalid.disconnect();
          resolve();
        });
        invalid.once('connect', () => {
          invalid.disconnect();
          reject(new Error('Unauthorized socket accepted'));
        });
      });
    }
  });
  it('delivers typed committed events to an authorized socket and disconnects after revocation', async () => {
    const url = await app.getUrl();
    socket = io(url + '/operations', {
      auth: { token: viewerToken },
      transports: ['websocket'],
      reconnection: false,
    });
    await new Promise<void>((resolve, reject) => {
      socket!.once('connect', resolve);
      socket!.once('connect_error', reject);
    });

    const event: LogisticsEvent = {
      id: randomUUID(),
      name: 'fleet.position.updated',
      occurredAt: new Date().toISOString(),
      payload: {
        vehicleId,
        latitude: 19.4,
        longitude: -99.1,
        observedAt: new Date().toISOString(),
      },
    };
    const received = new Promise<LogisticsEvent>((resolve) => {
      const listener = (incoming: LogisticsEvent) => {
        if (incoming.id === event.id) {
          socket!.off('event', listener);
          resolve(incoming);
        }
      };
      socket!.on('event', listener);
    });
    await app.get(LocalEventBus).publish(event);
    expect(await received).toEqual(event);
    await app.get(OutboxDispatcher).flush();
    await vi.waitFor(
      async () => {
        expect(
          await prisma.outboxEvent.count({
            where: {
              deliveredAt: null,
              body: { path: ['payload', 'shipmentId'], equals: shipmentId },
            },
          }),
        ).toBe(0);
      },
      { timeout: 5000 },
    );
    await prisma.user.update({
      where: { id: viewerId },
      data: { roles: { set: [] } },
    });
    const disconnected = new Promise<void>((resolve) =>
      socket!.once('disconnect', () => resolve()),
    );
    await app.get(LocalEventBus).publish(event);
    await disconnected;
  });
  it('exports real filtered CSV with spreadsheet formula neutralization', async () => {
    await prisma.shipment.update({
      where: { id: shipmentId },
      data: { origin: '=HYPERLINK("https://invalid")' },
    });
    const report = await authorized()
      .get('/api/v1/reports/shipments.csv')
      .query({ search: reference })
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(report.headers['content-type']).toContain('text/csv');
    expect(report.headers['content-disposition']).toContain('attachment');
    expect(report.text).toContain(reference);
    expect(report.text).toContain("'=HYPERLINK");
    await authorized()
      .get('/api/v1/reports/inventory.csv')
      .auth(token, { type: 'bearer' })
      .expect(200);
  });
  it('logout revokes the same session even with a previously rotated refresh cookie', async () => {
    await authorized()
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookie)
      .expect(200);
    await authorized()
      .post('/api/v1/auth/logout')
      .set('Cookie', cookie)
      .expect(204);
    await authorized()
      .get('/api/v1/auth/me')
      .auth(token, { type: 'bearer' })
      .expect(401);
  });
});
