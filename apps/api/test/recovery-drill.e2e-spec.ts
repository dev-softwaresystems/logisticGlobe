import { randomUUID, randomBytes } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/config/configure-app.js';
import { validateEnvironment } from '../src/config/environment.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';
import { MongoService } from '../src/infrastructure/database/mongo.service.js';
import { RedisService } from '../src/infrastructure/cache/redis.service.js';
import { TelemetryRepository } from '../src/fleet/infrastructure/telemetry.repository.js';
import { TelemetryReconciler } from '../src/fleet/infrastructure/telemetry-reconciler.js';
import { exerciseTool } from './tools.js';
describe.skipIf(process.env.CLOSURE_RECOVERY !== 'true')(
  'Functional isolated recovery drill',
  () => {
    it('restores nonempty SQL/Mongo and measures simulated incident to login/domain recovery', async () => {
      const prefix = 'REC-' + randomUUID(),
        uid = randomUUID(),
        vid = randomUUID(),
        wid = randomUUID(),
        iid = randomUUID(),
        sid = randomUUID(),
        password = randomBytes(24).toString('hex');
      const config = validateEnvironment({ ...process.env, ROUTING_URL: '' });
      const startApp = async (
        settings: ReturnType<typeof validateEnvironment>,
      ) => {
        const module = await Test.createTestingModule({ imports: [AppModule] })
          .overrideProvider(ConfigService)
          .useValue(new ConfigService(settings))
          .compile();
        const app = module.createNestApplication({ logger: false });
        configureApp(app);
        await app.listen(0, '127.0.0.1');
        app.get(TelemetryReconciler).onModuleDestroy();
        return app;
      };
      let source: INestApplication | undefined,
        restored: INestApplication | undefined,
        sourceClosed = false;
      try {
        source = await startApp(config);
        const db = source.get<PrismaService>(PrismaService);
        await db.role.upsert({
          where: { name: 'ADMIN' },
          create: { name: 'ADMIN' },
          update: {},
        });
        await db.user.create({
          data: {
            id: uid,
            email: uid + '@recovery.test',
            name: 'Synthetic recovery',
            passwordHash: await bcrypt.hash(password, 12),
            roles: { connect: { name: 'ADMIN' } },
          },
        });
        await db.vehicle.create({
          data: { id: vid, plate: prefix, status: 'ON_ROUTE' },
        });
        await db.warehouse.create({
          data: {
            id: wid,
            code: prefix,
            name: 'Recovery synthetic',
            capacityUnits: 100,
          },
        });
        await db.inventoryItem.create({
          data: {
            id: iid,
            warehouseId: wid,
            sku: prefix,
            name: 'Recovery item',
            quantity: 5,
            threshold: { create: { minimumQuantity: 10 } },
            alerts: { create: {} },
          },
        });
        await db.shipment.create({
          data: {
            id: sid,
            reference: prefix,
            origin: 'Fixture',
            destination: 'Fixture',
            vehicleId: vid,
            status: 'IN_TRANSIT',
          },
        });
        const base = Date.now() - 60000;
        const plan = await db.routePlan.create({
          data: {
            vehicleId: vid,
            version: 1,
            requestId: randomUUID(),
            requestHash: 'recovery-fixture',
            shipmentIds: [sid],
            actorId: uid,
            effectiveAt: new Date(base - 1000),
            geometry: [
              [0, 0],
              [0.1, 0],
            ],
            parameters: {
              corridorMeters: 200,
              confirmSeconds: 30,
              confirmObservations: 3,
              stopRadiusMeters: 30,
              stopSeconds: 300,
              maxGapSeconds: 120,
              maxAccuracyMeters: 100,
              authorizedStops: [],
            },
          },
        });
        const points = [];
        for (const offset of [0, 30, 60]) {
          const saved = await source.get(TelemetryRepository).save(vid, {
            id: randomUUID(),
            latitude: 0.01,
            longitude: 0.05,
            observedAt: new Date(base + offset * 1000).toISOString(),
            accuracyMeters: 5,
          });
          await source.get(TelemetryReconciler).process(saved.position);
          points.push(saved.position);
        }
        const incident = await db.routeIncident.findFirstOrThrow({
          where: { planId: plan.id },
        });
        const lastRecovered = points[2];
        const incidentAt = new Date(),
          clock = performance.now();
        await source.close();
        sourceClosed = true; // Simulated withdrawal of this owned fixture API, original services/data remain.
        const database = new URL(config.DATABASE_URL).pathname.slice(1),
          mongoDatabase = new URL(config.MONGODB_URI).pathname.slice(1);
        const backupRaw = await exerciseTool('backup.mjs', {
          BACKUP_POSTGRES_DB: database,
          BACKUP_MONGO_DB: mongoDatabase,
        });
        const backup = JSON.parse(backupRaw) as { backupDirectory: string };
        const backupManifest = JSON.parse(
          await readFile(
            resolve(backup.backupDirectory, 'manifest.json'),
            'utf8',
          ),
        ) as { createdAt: string };
        const verify = await exerciseTool('recovery-restore.mjs', {
          RECOVERY_BACKUP_DIRECTORY: backup.backupDirectory,
        });
        const result = JSON.parse(verify.split('\nThe isolated')[0]) as {
          targetDatabase: string;
          mongo: { telemetry: number };
          postgres: { users: number; shipments: number; items: number };
        };
        const uri = new URL(config.DATABASE_URL);
        uri.pathname = '/' + result.targetDatabase;
        const mongoUri = new URL(config.MONGODB_URI);
        mongoUri.pathname = '/' + result.targetDatabase;
        restored = await startApp(
          validateEnvironment({
            ...process.env,
            DATABASE_URL: uri.href,
            MONGODB_URI: mongoUri.href,
            ROUTING_URL: '',
          }),
        );
        await restored.get(RedisService).delete('fleet:position:' + vid);
        const login = await request(restored.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: uid + '@recovery.test', password })
          .expect(200);
        const token = login.body.accessToken as string;
        await request(restored.getHttpServer())
          .get('/api/v1/health/ready')
          .expect(200);
        expect(
          (
            await request(restored.getHttpServer())
              .get('/api/v1/shipments/' + sid)
              .auth(token, { type: 'bearer' })
              .expect(200)
          ).body.status,
        ).toBe('IN_TRANSIT');
        const restoredDb = restored.get<PrismaService>(PrismaService);
        expect(
          (
            await restoredDb.inventoryItem.findUniqueOrThrow({
              where: { id: iid },
            })
          ).quantity,
        ).toBe(5);
        expect(
          (
            await restoredDb.routeIncident.findUniqueOrThrow({
              where: { id: incident.id },
            })
          ).kind,
        ).toBe('DEVIATION');
        const latest = await restored.get(TelemetryRepository).latest(vid);
        expect(latest?.id).toBe(lastRecovered.id);
        expect(
          await (
            await restored.get(MongoService).collection('vehicle_telemetry')
          ).countDocuments({ vehicleId: vid }),
        ).toBe(3);
        const restoredAt = new Date(),
          rtoMs = performance.now() - clock;
        const record = {
          testedAt: restoredAt.toISOString(),
          incidentDefinition:
            'Simulated withdrawal of owned fixture API after quiescing; no original DB/volumes deleted',
          incidentAt: incidentAt.toISOString(),
          backupCreatedAt: backupManifest.createdAt,
          sourceDatabasesPreserved: true,
          targetDatabase: result.targetDatabase,
          fixture: {
            users: 1,
            shipments: 1,
            items: 1,
            telemetry: 3,
            incidents: 1,
          },
          validation: {
            login: true,
            readiness: true,
            shipment: true,
            stock: true,
            incident: true,
            mongoHistory: true,
            redisReadThrough: true,
          },
          recoveredObservationId: lastRecovered.id,
          recoveredObservationAt: lastRecovered.observedAt,
          recoveredReceivedAt: lastRecovered.receivedAt,
          rtoMs,
          rpoGapMs:
            incidentAt.getTime() - new Date(lastRecovered.receivedAt).getTime(),
          lostPreIncidentOwnedObservations: 0,
          limits: [
            'Synthetic small dataset; no production outage or PITR/offsite tested',
            'Cross-engine writes quiesced for consistent drill, not distributed transaction',
            'No continuous backup schedule, <15min production RPO unproven',
            'Redis cache read-through tested; sessions remain SQL',
          ],
        };
        await mkdir('../../artifacts/closure', { recursive: true });
        await writeFile(
          '../../artifacts/closure/recovery-drill.json',
          JSON.stringify(record, null, 2),
        );
        console.log(JSON.stringify(record));
      } finally {
        await restored?.close();
        if (source) {
          if (sourceClosed) source = await startApp(config);
          const db = source.get<PrismaService>(PrismaService),
            events = await db.outboxEvent.findMany(),
            owned = [uid, vid, wid, iid, sid];
          await db.outboxEvent.deleteMany({
            where: {
              id: {
                in: events
                  .filter((e) =>
                    owned.some((id) => JSON.stringify(e.body).includes(id)),
                  )
                  .map((e) => e.id),
              },
            },
          });
          await db.shipment.deleteMany({ where: { id: sid } });
          await db.vehicle.deleteMany({ where: { id: vid } });
          await db.inventoryItem.deleteMany({ where: { id: iid } });
          await db.warehouse.deleteMany({ where: { id: wid } });
          await db.user.deleteMany({ where: { id: uid } });
          await (
            await source.get(MongoService).collection('vehicle_telemetry')
          ).deleteMany({ vehicleId: vid });
          await source.get(RedisService).delete('fleet:position:' + vid);
          await source.get(RedisService).delete('monitoring:' + vid);
          await source.close();
        }
      }
    }, 180000);
  },
);
