import { randomUUID, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { cpus, totalmem, platform, release } from 'node:os';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { io } from 'socket.io-client';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/config/configure-app.js';
import { validateEnvironment } from '../src/config/environment.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';
import { MongoService } from '../src/infrastructure/database/mongo.service.js';
import { RedisService } from '../src/infrastructure/cache/redis.service.js';
import { RoutingService } from '../src/modules/routing/routing.service.js';
import { MonitoringService } from '../src/modules/routing/monitoring.service.js';
import { registry } from '../src/infrastructure/observability/metrics.js';
const bounded = (
  name: string,
  defaultValue: number,
  min: number,
  max: number,
) => {
  const value = Number(process.env[name] ?? defaultValue);
  if (!Number.isFinite(value) || value < min || value > max)
    throw Error(name + ' outside safe local profile');
  return value;
};
const pause = (ms: number) => new Promise((yes) => setTimeout(yes, ms));
const percentile = (values: number[], p: number) =>
  values.length
    ? Math.round(
        [...values].sort((a, b) => a - b)[Math.ceil(values.length * p) - 1] *
          100,
      ) / 100
    : null;
describe.skipIf(process.env.CLOSURE_LOAD !== 'true')(
  'Sustained reference load, isolated 500/100',
  () => {
    it(
      'records measured operations and faults without claiming a contractual routing result',
      async () => {
        const duration = bounded('LOAD_SECONDS', 180, 30, 3600),
          warmup = bounded('LOAD_WARMUP_SECONDS', 15, 0, 120),
          gpsMs = bounded('LOAD_GPS_MS', 5000, 2000, 60000),
          users = bounded('LOAD_USERS', 5, 1, 10),
          replicas = bounded('LOAD_REPLICAS', 1, 1, 2);
        const prefix = 'LOAD-' + randomUUID(),
          uid = randomUUID(),
          wid = randomUUID(),
          iid = randomUUID(),
          vids = Array.from({ length: 100 }, () => randomUUID()),
          sids = Array.from({ length: 500 }, () => randomUUID());
        const gpsKey = randomBytes(32).toString('hex'),
          password = randomBytes(24).toString('hex');
        let prisma!: PrismaService;
        const apps: INestApplication[] = [],
          urls: string[] = [],
          adapter: { ms: number; result: string; measured: boolean }[] = [];
        const samples: Record<string, { ms: number; status: number }[]> = {};
        let measuring = false,
          reconnects = 0,
          readRecovery = false,
          maxRss = 0,
          partialFailureExercised = false;
        const server = createServer((req, res) => {
          // Explicit synthetic transport/provider fault. No commercial routing dataset.
          const bad = (req.url ?? '').includes('0.003999');
          res
            .writeHead(bad ? 503 : 200, { 'content-type': 'application/json' })
            .end(
              JSON.stringify(
                bad
                  ? { code: 'Unavailable' }
                  : {
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
                    },
              ),
            );
        });
        const call = async (
          index: number,
          operation: string,
          path: string,
          token: string,
          body?: unknown,
        ) => {
          const started = performance.now();
          let status = 0,
            measuredOperation = operation;
          try {
            const response = await fetch(urls[index] + path, {
              method: body ? 'POST' : 'GET',
              headers: {
                authorization: 'Bearer ' + token,
                'content-type': 'application/json',
              },
              body: body ? JSON.stringify(body) : undefined,
              signal: AbortSignal.timeout(10000),
            });
            status = response.status;
            const result = await response.json();
            if (operation === 'routing-hit' || operation === 'routing-miss')
              measuredOperation = response.ok
                ? result.cached
                  ? 'routing-cache-hit'
                  : 'routing-cache-miss'
                : 'routing-error';
            return { status, result };
          } catch {
            return { status, result: null };
          } finally {
            if (measuring)
              (samples[measuredOperation] ??= []).push({
                ms: performance.now() - started,
                status,
              });
          }
        };
        let socket: ReturnType<typeof io> | undefined;
        const startedAt = new Date(),
          cpuStart = process.cpuUsage(),
          wall = performance.now();
        try {
          await new Promise<void>((yes) => server.listen(0, '127.0.0.1', yes));
          const address = server.address();
          if (!address || typeof address === 'string')
            throw Error('Provider fixture failed');
          const config = validateEnvironment({
            ...process.env,
            ROUTING_URL: 'http://127.0.0.1:' + address.port,
            GPS_INGEST_TOKEN: gpsKey,
            GPS_ALLOWED_VEHICLE_IDS: vids.join(','),
            DISTRIBUTED_REALTIME: String(replicas === 2),
            DISTRIBUTED_RATE_LIMIT: String(replicas === 2),
          });
          for (let index = 0; index < replicas; index++) {
            const module = await Test.createTestingModule({
              imports: [AppModule],
            })
              .overrideProvider(ConfigService)
              .useValue(new ConfigService(config))
              .compile();
            const app = module.createNestApplication({ logger: false });
            configureApp(app);
            await app.listen(0, '127.0.0.1');
            apps.push(app);
            urls.push(await app.getUrl());
            const service = app.get(RoutingService),
              original = service.route.bind(service);
            vi.spyOn(service, 'route').mockImplementation(async (input) => {
              const before = performance.now();
              try {
                const result = await original(input);
                adapter.push({
                  ms: performance.now() - before,
                  result: result.cached ? 'cache' : 'provider',
                  measured: measuring,
                });
                return result;
              } catch (error) {
                adapter.push({
                  ms: performance.now() - before,
                  result: 'error',
                  measured: measuring,
                });
                throw error;
              }
            });
          }
          prisma = apps[0].get<PrismaService>(PrismaService);
          await prisma.role.upsert({
            where: { name: 'ADMIN' },
            update: {},
            create: { name: 'ADMIN' },
          });
          await prisma.user.create({
            data: {
              id: uid,
              email: uid + '@load.test',
              name: 'Synthetic load',
              passwordHash: await bcrypt.hash(password, 12),
              roles: { connect: { name: 'ADMIN' } },
            },
          });
          await prisma.vehicle.createMany({
            data: vids.map((id, i) => ({
              id,
              plate: prefix + '-' + i,
              status: 'ON_ROUTE',
            })),
          });
          await prisma.shipment.createMany({
            data: sids.map((id, i) => ({
              id,
              reference: prefix + '-' + i,
              origin: 'Fixture',
              destination: 'Fixture',
              status: 'IN_TRANSIT',
              vehicleId: vids[i % 100],
            })),
          });
          await prisma.warehouse.create({
            data: {
              id: wid,
              code: prefix,
              name: 'Load synthetic',
              capacityUnits: 1000,
            },
          });
          await prisma.inventoryItem.create({
            data: {
              id: iid,
              sku: prefix,
              name: 'Load item',
              warehouseId: wid,
              quantity: 50,
              threshold: { create: { minimumQuantity: 10 } },
            },
          });
          await prisma.routePlan.createMany({
            data: vids.map((vehicleId, i) => ({
              vehicleId,
              version: 1,
              requestId: randomUUID(),
              requestHash: 'load-fixture',
              shipmentIds: [sids[i]],
              geometry: [
                [0, 0],
                [0.1, 0],
              ],
              parameters: {
                corridorMeters: 200,
                confirmSeconds: 60,
                confirmObservations: 3,
                stopRadiusMeters: 30,
                stopSeconds: 300,
                maxGapSeconds: 120,
                maxAccuracyMeters: 100,
                authorizedStops: [],
              },
              actorId: uid,
              effectiveAt: new Date(Date.now() - 1000),
            })),
          });
          const login = await call(0, 'login', '/api/v1/auth/login', '', {
            email: uid + '@load.test',
            password,
          });
          if (login.status !== 200) throw Error('Fixture login failed');
          const token = (login.result as { accessToken: string }).accessToken;
          socket = io(urls[0] + '/operations', {
            auth: { token },
            transports: ['websocket'],
            reconnection: false,
          });
          socket.on('connect', () => {
            reconnects++;
          });
          const deadline = performance.now() + (warmup + duration) * 1000,
            measureAt = performance.now() + warmup * 1000;
          const userLoops = Array.from({ length: users }, async (_, user) => {
            let turn = 0;
            while (performance.now() < deadline) {
              measuring = performance.now() >= measureAt;
              const kind = turn++ % 4,
                index = user % replicas;
              if (kind === 0)
                await call(
                  index,
                  'dashboard',
                  '/api/v1/dashboard/summary',
                  token,
                );
              if (kind === 1)
                await call(
                  index,
                  'fleet',
                  '/api/v1/fleet/vehicles?pageSize=100&search=' + prefix,
                  token,
                );
              if (kind === 2)
                await call(index, 'inventory', '/api/v1/inventory', token);
              if (kind === 3) {
                const n = turn + user,
                  miss = n % 2 === 0,
                  bad = n % 20 === 0;
                await call(
                  index,
                  bad
                    ? 'routing-injected-error'
                    : miss
                      ? 'routing-miss'
                      : 'routing-hit',
                  '/api/v1/routing/route',
                  token,
                  {
                    origin: {
                      latitude: 0,
                      longitude: bad ? 0.003999 : miss ? n / 100000 : 0,
                    },
                    destination: { latitude: 0, longitude: 0.1 },
                  },
                );
              }
              maxRss = Math.max(maxRss, process.memoryUsage().rss);
              await pause(3000);
            }
          });
          const gpsLoop = (async () => {
            let cycle = 0;
            while (performance.now() < deadline) {
              const before = performance.now();
              measuring = before >= measureAt;
              cycle++;
              for (let offset = 0; offset < 100; offset += 10)
                await Promise.all(
                  vids.slice(offset, offset + 10).map(async (vehicleId, i) => {
                    const late = cycle % 7 === 0 && i === 0;
                    const point = {
                      id: randomUUID(),
                      vehicleId,
                      latitude: 0,
                      longitude: 0.01 + cycle / 10000,
                      observedAt: new Date(
                        Date.now() - (late ? 30000 : 0),
                      ).toISOString(),
                      accuracyMeters: 5,
                    };
                    await call(
                      (offset + i) % replicas,
                      late ? 'gps-late' : 'gps',
                      '/api/v1/integrations/gps/positions',
                      gpsKey,
                      point,
                    );
                    if (offset === 0 && i === 0)
                      await call(
                        0,
                        'gps-replay',
                        '/api/v1/integrations/gps/positions',
                        gpsKey,
                        point,
                      );
                  }),
                );
              if (measuring && !partialFailureExercised) {
                partialFailureExercised = true;
                const injection = vi
                  .spyOn(apps[0].get(MonitoringService), 'evaluate')
                  .mockRejectedValueOnce(Error('Injected transient SQL fault'));
                const point = {
                  id: randomUUID(),
                  vehicleId: vids[0],
                  latitude: 0,
                  longitude: 0.02,
                  observedAt: new Date().toISOString(),
                };
                const failure = await call(
                  0,
                  'gps-injected-partial',
                  '/api/v1/integrations/gps/positions',
                  gpsKey,
                  point,
                );
                injection.mockRestore();
                if (failure.status !== 503)
                  throw Error('Partial failure injection not exercised');
                await call(
                  replicas - 1,
                  'gps-partial-retry',
                  '/api/v1/integrations/gps/positions',
                  gpsKey,
                  point,
                );
                socket!.disconnect();
                socket!.connect();
                readRecovery =
                  (
                    await call(
                      replicas - 1,
                      'reconnect-http-recovery',
                      '/api/v1/fleet/vehicles/' + vids[0],
                      token,
                    )
                  ).status === 200;
              }
              await pause(Math.max(0, gpsMs - (performance.now() - before)));
            }
          })();
          await Promise.all([...userLoops, gpsLoop]);
          const collection = await apps[0]
              .get(MongoService)
              .collection('vehicle_telemetry'),
            pending = await collection.countDocuments({
              vehicleId: { $in: vids },
              monitoringPending: true,
            });
          const backlog = await prisma.outboxEvent.count({
            where: { deliveredAt: null },
          });
          const cpu = process.cpuUsage(cpuStart);
          const stats = (rows: { ms: number; status: number }[]) => ({
            requests: rows.length,
            p50: percentile(
              rows.map((r) => r.ms),
              0.5,
            ),
            p95: percentile(
              rows.map((r) => r.ms),
              0.95,
            ),
            p99: percentile(
              rows.map((r) => r.ms),
              0.99,
            ),
            errors: rows.filter((r) => r.status < 200 || r.status >= 400)
              .length,
            timeouts: rows.filter((r) => r.status === 0).length,
            statuses: rows.reduce<Record<string, number>>(
              (m, r) => ({ ...m, [r.status]: (m[r.status] ?? 0) + 1 }),
              {},
            ),
          });
          const relevant = adapter.filter((r) => r.measured),
            result = {
              startedAt: startedAt.toISOString(),
              finishedAt: new Date().toISOString(),
              revision: execFileSync('git', ['rev-parse', 'HEAD'], {
                encoding: 'utf8',
              }).trim(),
              dirty: true,
              runtime: process.version,
              hardware: {
                platform: platform(),
                release: release(),
                cpu: cpus()[0]?.model,
                logicalCpus: cpus().length,
                totalMemory: totalmem(),
              },
              profile: {
                activeShipments: 500,
                vehicles: 100,
                gpsIntervalMs: gpsMs,
                users,
                readIntervalMs: 3000,
                warmupSeconds: warmup,
                measurementSeconds: duration,
                replicas,
                provider: 'synthetic OSRM-compatible, no real dataset',
                acceptance: 'proposed reference profile, not contractual',
              },
              operations: Object.fromEntries(
                Object.entries(samples).map(([name, rows]) => [
                  name,
                  stats(rows),
                ]),
              ),
              throughput:
                Object.values(samples).reduce(
                  (sum, rows) => sum + rows.length,
                  0,
                ) / duration,
              adapter: Object.fromEntries(
                ['cache', 'provider', 'error'].map((result) => [
                  result,
                  {
                    samples: relevant.filter((r) => r.result === result).length,
                    p50: percentile(
                      relevant
                        .filter((r) => r.result === result)
                        .map((r) => r.ms),
                      0.5,
                    ),
                    p95: percentile(
                      relevant
                        .filter((r) => r.result === result)
                        .map((r) => r.ms),
                      0.95,
                    ),
                    p99: percentile(
                      relevant
                        .filter((r) => r.result === result)
                        .map((r) => r.ms),
                      0.99,
                    ),
                  },
                ]),
              ),
              cacheHitRate: relevant.length
                ? relevant.filter((r) => r.result === 'cache').length /
                  relevant.length
                : null,
              resources: {
                apiProcessMaxRss: maxRss,
                apiCpuUserMs: cpu.user / 1000,
                apiCpuSystemMs: cpu.system / 1000,
                wallMs: performance.now() - wall,
                pools: 'not instrumented',
                databaseCpu: 'not measured',
              },
              pendingOwnedTelemetry: pending,
              outboxPendingAllTestFixtures: backlog,
              connections: reconnects,
              httpRecoveredAfterReconnect: readRecovery,
              partialFailureExercised,
              providerInternalLatency:
                'not measured; fixture transport cannot validate <50ms',
            };
          await mkdir('../../artifacts/closure', { recursive: true });
          await writeFile(
            '../../artifacts/closure/sustained-load.json',
            JSON.stringify(result, null, 2),
          );
          await writeFile(
            '../../artifacts/closure/sustained-metrics.prom',
            await registry.metrics(),
          );
          console.log(JSON.stringify(result));
          expect(pending).toBe(0);
          expect(readRecovery).toBe(true);
        } finally {
          socket?.disconnect();
          if (prisma) {
            const events = await prisma.outboxEvent.findMany();
            const own = [uid, wid, iid, ...vids, ...sids];
            await prisma.outboxEvent.deleteMany({
              where: {
                id: {
                  in: events
                    .filter((e) =>
                      own.some((id) => JSON.stringify(e.body).includes(id)),
                    )
                    .map((e) => e.id),
                },
              },
            });
            await prisma.shipment.deleteMany({ where: { id: { in: sids } } });
            await prisma.vehicle.deleteMany({ where: { id: { in: vids } } });
            await prisma.inventoryItem.deleteMany({ where: { id: iid } });
            await prisma.warehouse.deleteMany({ where: { id: wid } });
            await prisma.user.deleteMany({ where: { id: uid } });
            await (
              await apps[0].get(MongoService).collection('vehicle_telemetry')
            ).deleteMany({ vehicleId: { $in: vids } });
            for (const id of vids) {
              await apps[0].get(RedisService).delete('fleet:position:' + id);
              await apps[0].get(RedisService).delete('monitoring:' + id);
            }
          }
          for (const app of apps) await app.close();
          await new Promise<void>((yes) => server.close(() => yes()));
        }
      },
      (Number(process.env.LOAD_SECONDS ?? 180) +
        Number(process.env.LOAD_WARMUP_SECONDS ?? 15) +
        120) *
        1000,
    );
  },
);
