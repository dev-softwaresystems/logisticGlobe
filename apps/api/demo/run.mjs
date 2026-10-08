import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { config } from 'dotenv';
import { createHash, randomUUID } from 'node:crypto';
import pg from 'pg';
import { AppModule } from '../dist/app.module.js';
import { PrismaService } from '../dist/infrastructure/database/prisma.service.js';
import { MongoService } from '../dist/infrastructure/database/mongo.service.js';
import { FleetService } from '../dist/fleet/fleet.service.js';
import { ShipmentsService } from '../dist/shipments/shipments.service.js';
import { InventoryService } from '../dist/inventory/inventory.service.js';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PositionDto } from '../dist/fleet/fleet.dto.js';
config({ path: ['.env.local', '.env'], quiet: true });
if (process.env.NODE_ENV === 'production')
  throw new Error('Demonstration commands are disabled in production');
for (const connection of [
  process.env.DATABASE_URL,
  process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics',
  process.env.REDIS_URL || 'redis://localhost:6379',
]) {
  try {
    if (
      !connection ||
      !['localhost', '127.0.0.1', '[::1]'].includes(
        new URL(connection).hostname,
      )
    )
      throw new Error();
  } catch {
    throw new Error(
      'Demonstration commands require valid loopback database connections',
    );
  }
}
const mode = process.argv[2];
if (!['seed', 'simulate', 'verify'].includes(mode))
  throw new Error('Choose seed, simulate or verify');
const prefix = 'LGD-V1-';
const places = [
  ['MEX', 'Ciudad de México', 19.4326, -99.1332],
  ['TOL', 'Toluca', 19.2826, -99.6557],
  ['QRO', 'Querétaro', 20.5888, -100.3899],
  ['PUE', 'Puebla', 19.0414, -98.2063],
];
const app = await NestFactory.createApplicationContext(AppModule, {
  logger: false,
});
const prisma = app.get(PrismaService),
  fleet = app.get(FleetService),
  shipments = app.get(ShipmentsService),
  inventory = app.get(InventoryService);
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
});
const lock = await pool.connect();
let stop = false;
process.on('SIGINT', () => {
  stop = true;
});
process.on('SIGTERM', () => {
  stop = true;
});
try {
  if (
    !(await lock.query('SELECT pg_try_advisory_lock(741007, 1) AS locked'))
      .rows[0].locked
  )
    throw new Error(
      'Another demonstration command owns this dataset; stop it before continuing',
    );
  const email = (
    process.env.DEMO_EMAIL ||
    process.env.SEED_ADMIN_EMAIL ||
    'admin@logisticsglobe.local'
  )
    .trim()
    .toLowerCase();
  const actor = await prisma.user.findUnique({
    where: { email },
    include: { roles: true },
  });
  if (!actor?.active || !actor.roles.some((r) => r.name === 'ADMIN'))
    throw new Error(
      'An existing active ADMIN is required; no credentials or roles will be modified',
    );
  let registry = await prisma.auditLog.findFirst({
    where: { targetId: prefix, action: 'DEMO_NAMESPACE_V1' },
  });
  if (!registry) {
    if (mode !== 'seed') throw new Error('Run demo:seed first');
    const collisions = await Promise.all([
      prisma.vehicle.count({ where: { plate: { startsWith: prefix } } }),
      prisma.shipment.count({ where: { reference: { startsWith: prefix } } }),
      prisma.warehouse.count({ where: { code: { startsWith: prefix } } }),
      prisma.inventoryItem.count({ where: { sku: { startsWith: prefix } } }),
    ]);
    if (collisions.some(Boolean))
      throw new Error(
        'Demo namespace is occupied without its ownership record; existing data preserved',
      );
    registry = await prisma.auditLog.create({
      data: {
        targetId: prefix,
        actorId: actor.id,
        action: 'DEMO_NAMESPACE_V1',
        changes: {
          classification:
            'Fictional local operation; no real customers/devices',
          version: 1,
          region: 'Central Mexico',
          vehicles: 20,
          shipments: 80,
          warehouses: 4,
          items: 24,
        },
      },
    });
  }
  const mongo = await app.get(MongoService).collection('vehicle_telemetry');
  const observe = async (vehicleId, input) => {
    const dto = plainToInstance(PositionDto, input);
    await validateOrReject(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    return fleet.position(vehicleId, dto, {
      source: 'simulated',
      actorId: actor.id,
    });
  };
  if (mode === 'seed') {
    const vehicles = [];
    for (let n = 0; n < 20; n++) {
      const plate = prefix + 'MX-' + String(n + 1).padStart(3, '0');
      let vehicle = await prisma.vehicle.findUnique({ where: { plate } });
      if (!vehicle) {
        vehicle = await fleet.create(
          { plate, capacityKg: n < 12 ? 12000 : 3500 },
          actor.id,
        );
        if (n >= 17)
          vehicle = await fleet.change(
            vehicle.id,
            {
              status: 'MAINTENANCE',
              expectedUpdatedAt: vehicle.updatedAt.toISOString(),
            },
            actor.id,
          );
      }
      vehicles.push(vehicle);
    }
    for (let n = 0; n < 80; n++) {
      const reference = prefix + 'ENV-' + String(n + 1).padStart(4, '0');
      if (await prisma.shipment.findUnique({ where: { reference } })) continue;
      const vehicle =
        n < 16
          ? vehicles[8 + (n % 4)]
          : n >= 24 && n < 48
            ? vehicles[(n - 24) % 8]
            : n >= 48 && n % 2 === 0
              ? vehicles[8 + (n % 9)]
              : null;
      if (vehicle?.status === 'MAINTENANCE')
        throw new Error(
          'An edited demo vehicle is in maintenance; no assignment was written',
        );
      let shipment = await shipments.create(
        {
          reference,
          origin: places[n % 4][1] + ' · centro DEMO',
          destination: places[(n + 1) % 4][1] + ' · recepción DEMO',
          priority: n % 4 === 0 ? 'HIGH' : 'NORMAL',
          ...(vehicle ? { vehicleId: vehicle.id } : {}),
        },
        actor.id,
      );
      const transition = async (status) => {
        shipment = await shipments.change(
          shipment.id,
          { status, expectedUpdatedAt: shipment.updatedAt.toISOString() },
          actor.id,
        );
      };
      if (n < 16 || (n >= 24 && n < 48)) await transition('IN_TRANSIT');
      if (n < 16) await transition('DELIVERED');
      if (n >= 16 && n < 24) await transition('CANCELLED');
    }
    const products = [
      'Tarimas retornables',
      'Cajas corrugadas',
      'Película de embalaje',
      'Contenedores plásticos',
      'Etiquetas logísticas',
      'Material de protección',
    ];
    for (const [code, city] of places) {
      const warehouseCode = prefix + code;
      let warehouse = await prisma.warehouse.findUnique({
        where: { code: warehouseCode },
      });
      if (!warehouse)
        warehouse = await inventory.createWarehouse(
          {
            code: warehouseCode,
            name: city + ' · almacén DEMO',
            capacityUnits: 3000,
          },
          actor.id,
        );
      for (let n = 0; n < products.length; n++) {
        const sku = prefix + code + '-' + String(n + 1).padStart(2, '0');
        if (
          await prisma.inventoryItem.findUnique({
            where: { warehouseId_sku: { warehouseId: warehouse.id, sku } },
          })
        )
          continue;
        const item = await inventory.create(
          {
            warehouseId: warehouse.id,
            sku,
            name: products[n] + ' · DEMO',
            quantity: n === 1 || n === 4 ? 8 : 160 + n * 30,
            minimumQuantity: 40,
          },
          actor.id,
        );
        if (n === 4)
          await inventory.adjust(
            item.id,
            {
              quantity: 120,
              minimumQuantity: 40,
              expectedUpdatedAt: item.updatedAt.toISOString(),
              reason:
                'DEMO: reposición documentada que resuelve una alerta crítica',
            },
            actor.id,
          );
      }
    }
    for (let n = 0; n < 18; n++) {
      const v = vehicles[n];
      if (await mongo.countDocuments({ vehicleId: v.id })) continue;
      const place = places[n % 4];
      const hash = createHash('sha256')
        .update(prefix + v.id)
        .digest('hex');
      const id =
        hash.slice(0, 8) +
        '-' +
        hash.slice(8, 12) +
        '-4' +
        hash.slice(13, 16) +
        '-a' +
        hash.slice(17, 20) +
        '-' +
        hash.slice(20, 32);
      await observe(v.id, {
        id,
        latitude: place[2] + Math.floor(n / 4) * 0.001,
        longitude: place[3] + Math.floor(n / 4) * 0.001,
        observedAt: new Date(
          registry.createdAt.getTime() - (n >= 15 ? 20 * 60000 : 0),
        ).toISOString(),
        accuracyMeters: 12,
        speedKph: 0,
        headingDegrees: 90,
      });
    }
    console.log(
      'DEMO seed ready: existing records, credentials and observed history preserved. No snapshots or calculated routes fabricated.',
    );
  }
  if (mode === 'simulate') {
    const apiUrl = process.env.DEMO_API_URL ?? 'http://localhost:3000/api/v1';
    const url = new URL(apiUrl);
    if (
      !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
      url.protocol !== 'http:' ||
      url.username ||
      url.password
    )
      throw new Error('Simulator only targets a loopback development API');
    const password =
      process.env.DEMO_PASSWORD || process.env.SEED_ADMIN_PASSWORD;
    if (!password)
      throw new Error(
        'Set private DEMO_PASSWORD or SEED_ADMIN_PASSWORD; it is never printed',
      );
    let sessionCookie = '';
    const call = async (path, body, token) => {
      const response = await fetch(apiUrl + path, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(sessionCookie ? { cookie: sessionCookie } : {}),
          ...(token ? { authorization: 'Bearer ' + token } : {}),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok)
        throw new Error(
          'Local API rejected demonstration request (HTTP ' +
            response.status +
            ')',
        );
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) sessionCookie = setCookie.split(';')[0];
      return response.status === 204 ? null : response.json();
    };
    let auth = await call('/auth/login', { email, password });
    try {
      const seconds = Number(process.env.DEMO_SECONDS ?? 300),
        interval = Number(process.env.DEMO_INTERVAL_MS ?? 5000);
      if (
        !Number.isFinite(seconds) ||
        seconds < 1 ||
        seconds > 3600 ||
        !Number.isInteger(interval) ||
        interval < 5000 ||
        interval > 60000
      )
        throw new Error(
          'DEMO_SECONDS must be 1..3600; DEMO_INTERVAL_MS 5000..60000',
        );
      const vehicles = await prisma.vehicle.findMany({
        where: {
          plate: { startsWith: prefix },
          status: 'ON_ROUTE',
          routePlans: { none: { retiredAt: null } },
        },
        orderBy: { plate: 'asc' },
        take: 6,
      });
      if (!vehicles.length)
        throw new Error('No eligible demo vehicles without operational plans');
      const points = await Promise.all(
        vehicles.map(async (v) => ({
          v,
          p: await app
            .get(FleetService)
            .detail(v.id)
            .then((d) => d.position),
        })),
      );
      if (points.some((row) => !row.p))
        throw new Error('Run demo:seed to provide initial positions');
      console.log(
        'SIMULATED telemetry: synthetic eastward trajectory, 30 km/h, no road-routing calls. Vehicles with active plans excluded. Ctrl+C stops without deleting history.',
      );
      const until = Date.now() + seconds * 1000;
      let previous = Date.now(),
        renewedAt = previous;
      while (!stop && Date.now() < until) {
        if (Date.now() - renewedAt > 5 * 60000) {
          auth = await call('/auth/refresh', {});
          renewedAt = Date.now();
        }
        const elapsed = (Date.now() - previous) / 1000;
        previous = Date.now();
        for (const row of points) {
          if (stop) break;
          const latest = await fleet.detail(row.v.id);
          if (
            latest.status !== 'ON_ROUTE' ||
            (await prisma.routePlan.count({
              where: { vehicleId: row.v.id, retiredAt: null },
            }))
          )
            continue;
          const p = latest.position;
          if (!p) continue;
          const longitude =
            p.longitude +
            (Math.min(elapsed, 60) * (30 / 3.6)) /
              (111320 * Math.cos((p.latitude * Math.PI) / 180));
          if (
            longitude > -97 ||
            longitude < -101 ||
            p.latitude < 18 ||
            p.latitude > 21
          )
            continue;
          const body = {
            id: randomUUID(),
            latitude: p.latitude,
            longitude,
            observedAt: new Date().toISOString(),
            speedKph: elapsed === 0 ? 0 : 30,
            headingDegrees: 90,
            accuracyMeters: 12,
            simulated: true,
          };
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              await call(
                '/fleet/vehicles/' + row.v.id + '/positions',
                body,
                auth.accessToken,
              );
              break;
            } catch (error) {
              if (attempt === 2) throw error;
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }
        }
        await new Promise((resolve) => {
          const finish = () => {
            clearTimeout(timer);
            process.removeListener('SIGINT', finish);
            process.removeListener('SIGTERM', finish);
            resolve();
          };
          const timer = setTimeout(
            finish,
            Math.min(interval, Math.max(1, until - Date.now())),
          );
          process.once('SIGINT', finish);
          process.once('SIGTERM', finish);
        });
      }
      console.log(
        'Simulator stopped; persisted historical observations retained.',
      );
    } finally {
      await call('/auth/logout', {}, auth.accessToken).catch(() => {});
    }
  }
  const vehicles = await prisma.vehicle.findMany({
    where: { plate: { startsWith: prefix } },
    include: { shipments: true },
  });
  const rows = await prisma.shipment.findMany({
    where: { reference: { startsWith: prefix } },
    include: {
      history: { orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }] },
      vehicle: true,
    },
  });
  const warehouses = await prisma.warehouse.findMany({
    where: { code: { startsWith: prefix } },
    include: {
      items: { include: { threshold: true, alerts: true, movements: true } },
    },
  });
  const invalid = rows.filter(
    (s) =>
      (s.status === 'IN_TRANSIT' && s.vehicle?.status !== 'ON_ROUTE') ||
      (s.status === 'DELIVERED' &&
        !s.history.some((h) => h.status === 'IN_TRANSIT')) ||
      s.history[0]?.status !== 'PENDING',
  );
  const badStock = warehouses
    .flatMap((w) => w.items)
    .filter(
      (i) =>
        !i.movements.length ||
        i.quantity < i.threshold.minimumQuantity !==
          i.alerts.some((a) => !a.resolvedAt),
    );
  if (invalid.length || badStock.length)
    throw new Error(
      'Demo coherence verification failed; existing edited records preserved',
    );
  console.log(
    JSON.stringify({
      namespace: prefix,
      classification: 'DEMONSTRATION',
      vehicles: vehicles.length,
      shipments: rows.length,
      warehouses: warehouses.length,
      items: warehouses.reduce((sum, w) => sum + w.items.length, 0),
      positionedVehicles: await mongo
        .distinct('vehicleId', {
          vehicleId: { $in: vehicles.map((v) => v.id) },
        })
        .then((ids) => ids.length),
      coherent: true,
    }),
  );
} finally {
  await lock.query('SELECT pg_advisory_unlock(741007, 1)').catch(() => {});
  lock.release();
  await pool.end();
  await app.close();
}
