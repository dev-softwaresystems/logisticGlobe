import { exerciseTool, readLoadEvidence } from './tools.js';
import { randomUUID, randomBytes } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import type {
  ServerEvents,
  ClientEvents,
  LogisticsEvent,
} from '@logistics-globe/shared';
import { AppModule } from '../src/app.module.js';
import { validateEnvironment } from '../src/config/environment.js';
import { configureApp } from '../src/config/configure-app.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';
import { MongoService } from '../src/infrastructure/database/mongo.service.js';
import { RedisService } from '../src/infrastructure/cache/redis.service.js';
import { RedisThrottlerStorage } from '../src/infrastructure/cache/redis-throttler.storage.js';
import { LocalEventBus } from '../src/infrastructure/messaging/event-bus.js';
import { OutboxDispatcher } from '../src/infrastructure/messaging/outbox.js';
import { SystemHealthService } from '../src/modules/system-health/system-health.service.js';
describe('Administration, integrations and two API replicas', () => {
  const adminId = randomUUID(),
    vehicleId = randomUUID(),
    secondaryId = randomUUID();
  const ids: string[] = [adminId];
  const events: string[] = [];
  const password = randomBytes(24).toString('hex'),
    gpsToken = randomBytes(32).toString('hex'),
    metricsToken = randomBytes(32).toString('hex');
  let apps: INestApplication[] = [];
  let prisma: PrismaService;
  let adminToken: string;
  let viewerToken: string;
  let viewerId: string;
  let viewerVersion: string;
  const sockets: Socket<ServerEvents, ClientEvents>[] = [];
  beforeAll(async () => {
    for (let index = 0; index < 2; index++) {
      const config = validateEnvironment({
        ...process.env,
        DISTRIBUTED_REALTIME: 'true',
        DISTRIBUTED_RATE_LIMIT: 'true',
        GPS_INGEST_TOKEN: gpsToken,
        GPS_ALLOWED_VEHICLE_IDS: vehicleId,
        METRICS_TOKEN: metricsToken,
        ROUTING_URL: '',
      });
      const module = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(ConfigService)
        .useValue(new ConfigService(config))
        .compile();
      const app = module.createNestApplication({ logger: false });
      configureApp(app);
      await app.listen(0, '127.0.0.1');
      apps.push(app);
    }
    prisma = apps[0].get(PrismaService);
    for (const name of [
      'ADMIN',
      'LOGISTICS_ADMIN',
      'FLEET_SUPERVISOR',
      'TRAFFIC_COORDINATOR',
      'WAREHOUSE_MANAGER',
      'VIEWER',
    ] as const)
      await prisma.role.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    await prisma.user.create({
      data: {
        id: adminId,
        email: adminId + '@replica.test',
        name: 'Replica test',
        passwordHash: await bcrypt.hash(password, 12),
        roles: { connect: { name: 'ADMIN' } },
      },
    });
    await prisma.vehicle.create({ data: { id: vehicleId, plate: vehicleId } });
    const login = await request(apps[0].getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminId + '@replica.test', password })
      .expect(200);
    adminToken = login.body.accessToken as string;
  }, 60000);
  afterAll(async () => {
    for (const socket of sockets) socket.disconnect();
    if (prisma) {
      const related = await prisma.outboxEvent.findMany({
        where: { body: { path: ['payload', 'vehicleId'], equals: vehicleId } },
      });
      await prisma.outboxEvent.deleteMany({
        where: { id: { in: [...events, ...related.map((event) => event.id)] } },
      });
      await prisma.auditLog.deleteMany({
        where: { OR: [{ actorId: { in: ids } }, { targetId: { in: ids } }] },
      });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
      await prisma.vehicle.deleteMany({ where: { id: vehicleId } });
      const mongo = await apps[0]
        .get(MongoService)
        .collection('vehicle_telemetry');
      await mongo.deleteMany({ vehicleId });
      await apps[0].get(RedisService).delete('fleet:position:' + vehicleId);
    }
    for (const app of apps) await app.close();
  }, 30000);
  const api = (index = 0) => request(apps[index].getHttpServer());
  it('requires ADMIN, creates a normalized user without exposing credentials, and audits changes', async () => {
    await api().get('/api/v1/users').expect(401);
    const response = await api()
      .post('/api/v1/users')
      .auth(adminToken, { type: 'bearer' })
      .send({
        email: '  ' + secondaryId + '@REPlica.test  ',
        name: '  Viewer test  ',
        password,
        roles: ['VIEWER'],
      })
      .expect(201);
    viewerId = response.body.id as string;
    ids.push(viewerId);
    viewerVersion = response.body.updatedAt as string;
    expect(response.body.email).toBe(secondaryId + '@replica.test');
    expect(response.body).not.toHaveProperty('passwordHash');
    expect(JSON.stringify(response.body)).not.toContain(password);
    const login = await api()
      .post('/api/v1/auth/login')
      .send({ email: response.body.email, password })
      .expect(200);
    viewerToken = login.body.accessToken as string;
    await api(1)
      .get('/api/v1/users')
      .auth(viewerToken, { type: 'bearer' })
      .expect(403);
    await api()
      .get('/api/v1/users')
      .query({ search: secondaryId, pageSize: 1 })
      .auth(adminToken, { type: 'bearer' })
      .expect(200)
      .then((response) => expect(response.body.total).toBe(1));
    const audit = await api()
      .get('/api/v1/users/' + viewerId + '/audit')
      .auth(adminToken, { type: 'bearer' })
      .expect(200);
    expect(audit.body.items[0].actorId).toBe(adminId);
  });
  it('rejects stale writes and revokes sessions on deactivation across replicas', async () => {
    const body = {
      name: 'Viewer test',
      roles: ['VIEWER'],
      active: false,
      expectedUpdatedAt: viewerVersion,
    };
    await api()
      .patch('/api/v1/users/' + viewerId)
      .auth(adminToken, { type: 'bearer' })
      .send({ ...body, expectedUpdatedAt: new Date(0).toISOString() })
      .expect(409);
    await api()
      .patch('/api/v1/users/' + viewerId)
      .auth(adminToken, { type: 'bearer' })
      .send(body)
      .expect(200);
    await api(1)
      .get('/api/v1/auth/me')
      .auth(viewerToken, { type: 'bearer' })
      .expect(401);
    await api()
      .post('/api/v1/auth/login')
      .send({ email: secondaryId + '@replica.test', password })
      .expect(401);
  });
  it('validates GPS integration token, vehicle scope, replay and coordinate history', async () => {
    const observation = {
      id: randomUUID(),
      vehicleId,
      latitude: 19.43,
      longitude: -99.13,
      observedAt: new Date().toISOString(),
    };
    await api()
      .post('/api/v1/integrations/gps/positions')
      .send(observation)
      .expect(401);
    await api()
      .post('/api/v1/integrations/gps/positions')
      .auth(gpsToken, { type: 'bearer' })
      .send({ ...observation, vehicleId: randomUUID() })
      .expect(403);
    await api()
      .post('/api/v1/integrations/gps/positions')
      .auth(gpsToken, { type: 'bearer' })
      .send({ ...observation, longitude: 999 })
      .expect(400);
    for (let index = 0; index < 2; index++)
      await api(index)
        .post('/api/v1/integrations/gps/positions')
        .auth(gpsToken, { type: 'bearer' })
        .send(observation)
        .expect(201);
    const history = await api()
      .get('/api/v1/fleet/vehicles/' + vehicleId + '/positions')
      .auth(adminToken, { type: 'bearer' })
      .expect(200);
    expect(history.body.total).toBe(1);
  });
  it('exposes protected metrics without URL labels and readiness returns 503 for a failed dependency', async () => {
    await api().get('/api/v1/metrics').expect(401);
    const metrics = await api()
      .get('/api/v1/metrics')
      .auth(metricsToken, { type: 'bearer' })
      .expect(200);
    expect(metrics.text).toContain('logistics_http_duration_seconds');
    expect(metrics.text).not.toContain(password);
    expect(metrics.text).not.toContain('vehicleId=');
    const spy = vi
      .spyOn(apps[0].get(SystemHealthService), 'services')
      .mockResolvedValueOnce({
        status: 'degraded',
        services: [{ name: 'redis', status: 'down', latencyMs: 1 }],
        checkedAt: new Date().toISOString(),
      });
    await api().get('/api/v1/health/ready').expect(503);
    spy.mockRestore();
    await api().get('/api/v1/health/ready').expect(200);
  });
  it('safe-fails unconfigured routing and validates coordinates', async () => {
    const body = {
      origin: { latitude: 19, longitude: -99 },
      destination: { latitude: 20, longitude: -98 },
    };
    await api()
      .post('/api/v1/routing/route')
      .auth(adminToken, { type: 'bearer' })
      .send(body)
      .expect(503);
    await api()
      .post('/api/v1/routing/route')
      .auth(adminToken, { type: 'bearer' })
      .send({ ...body, origin: { latitude: 999, longitude: 0 } })
      .expect(400);
    const status = await api()
      .get('/api/v1/integrations/status')
      .auth(adminToken, { type: 'bearer' })
      .expect(200);
    expect(status.body).toEqual({
      gpsConfigured: true,
      routingConfigured: false,
    });
  });
  it('shares rate limit counters between API instances', async () => {
    const key = randomUUID();
    const first = new RedisThrottlerStorage(apps[0].get(RedisService)),
      second = new RedisThrottlerStorage(apps[1].get(RedisService));
    expect(
      (await first.increment(key, 1000, 1, 1000, 'replica-test')).isBlocked,
    ).toBe(false);
    expect(
      (await second.increment(key, 1000, 1, 1000, 'replica-test')).isBlocked,
    ).toBe(true);
  });
  it('delivers a leased outbox event to sockets on both instances without duplicate dispatcher claims', async () => {
    for (const app of apps) {
      const socket = io((await app.getUrl()) + '/operations', {
        auth: { token: adminToken },
        transports: ['websocket'],
        reconnection: false,
      });
      sockets.push(socket);
      await new Promise<void>((resolve, reject) => {
        socket.once('connect', resolve);
        socket.once('connect_error', reject);
      });
    }
    const event: LogisticsEvent = {
      id: randomUUID(),
      name: 'fleet.vehicle.updated',
      occurredAt: new Date().toISOString(),
      payload: { vehicleId, status: 'AVAILABLE' },
    };
    events.push(event.id);
    const received = sockets.map(
      (socket) =>
        new Promise<LogisticsEvent>((resolve) => {
          const onEvent = (incoming: LogisticsEvent) => {
            if (incoming.id === event.id) {
              socket.off('event', onEvent);
              resolve(incoming);
            }
          };
          socket.on('event', onEvent);
        }),
    );
    const spies = apps.map((app) =>
      vi.spyOn(app.get(LocalEventBus), 'publish'),
    );
    await prisma.outboxEvent.create({
      data: { id: event.id, body: JSON.parse(JSON.stringify(event)) },
    });
    await Promise.all(apps.map((app) => app.get(OutboxDispatcher).flush()));
    for (const message of await Promise.all(received))
      expect(message).toEqual(event);
    await vi.waitFor(async () =>
      expect(
        (
          await prisma.outboxEvent.findUniqueOrThrow({
            where: { id: event.id },
          })
        ).deliveredAt,
      ).not.toBeNull(),
    );
    expect(
      spies
        .flatMap((spy) => spy.mock.calls)
        .filter(([incoming]) => incoming.id === event.id),
    ).toHaveLength(1);
    for (const spy of spies) spy.mockRestore();
  });

  it('forwards NDJSON GPS through the adapter and executes a paced HTTP load probe', async () => {
    const base = (await apps[0].getUrl()) + '/api/v1';
    const observation = {
      id: randomUUID(),
      vehicleId,
      latitude: 19.44,
      longitude: -99.14,
      observedAt: new Date().toISOString(),
    };
    const forwarded = await exerciseTool(
      'gps-forwarder.mjs',
      {
        GPS_API_URL: base + '/integrations/gps/positions',
        GPS_API_TOKEN: gpsToken,
      },
      JSON.stringify(observation) + '\n',
    );
    expect(JSON.parse(forwarded).accepted).toBe(1);
    await exerciseTool('load-test.mjs', {
      LOAD_API_URL: base,
      LOAD_ACCESS_TOKEN: adminToken,
      LOAD_SECONDS: '10',
      LOAD_CONCURRENCY: '1',
      LOAD_REQUEST_INTERVAL_MS: '1000',
    });
    const report = await readLoadEvidence();
    expect(report.failures).toBe(0);
    expect(report.completed).toBeGreaterThanOrEqual(8);
    expect(report.statuses['200']).toBe(report.completed);
  }, 20000);
  it('preserves one active administrator when concurrent demotions race', async () => {
    const other = await api()
      .post('/api/v1/users')
      .auth(adminToken, { type: 'bearer' })
      .send({
        email: randomUUID() + '@replica.test',
        name: 'Second test admin',
        password,
        roles: ['ADMIN'],
      })
      .expect(201);
    const otherId = other.body.id as string;
    ids.push(otherId);
    const before = await prisma.user.findUniqueOrThrow({
      where: { id: adminId },
    });
    const responses = await Promise.all(
      [
        [adminId, before.updatedAt.toISOString()],
        [otherId, other.body.updatedAt as string],
      ].map(([id, version]) =>
        api()
          .patch('/api/v1/users/' + id)
          .auth(adminToken, { type: 'bearer' })
          .send({
            name: 'Test administrator',
            active: true,
            roles: ['VIEWER'],
            expectedUpdatedAt: version,
          }),
      ),
    );
    expect(
      responses.map((response) => response.status).sort((a, b) => a - b),
    ).toEqual([200, 409]);
    expect(
      await prisma.user.count({
        where: { active: true, roles: { some: { name: 'ADMIN' } } },
      }),
    ).toBe(1);
  });
});
