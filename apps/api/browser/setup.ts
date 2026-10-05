import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { Redis } from 'ioredis';
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL!;
  if (!new URL(url).pathname.endsWith('_test'))
    throw new Error('A dedicated browser database is mandatory');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  const prefix = process.env.BROWSER_PREFIX!;
  const userId = randomUUID();
  const server = createServer((req, res) => {
    const parsed = new URL(req.url ?? '/', 'http://127.0.0.1:3012');
    if (!parsed.pathname.startsWith('/route/v1/driving/')) {
      res.writeHead(404).end();
      return;
    }
    const points = parsed.pathname
      .split('/')
      .at(-1)!
      .split(';')
      .map((point) => point.split(',').map(Number));
    res.writeHead(200, { 'content-type': 'application/json' }).end(
      JSON.stringify({
        code: 'Ok',
        routes: [
          {
            distance: 12345,
            duration: 900,
            geometry: { type: 'LineString', coordinates: points },
          },
        ],
      }),
    );
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(3012, '127.0.0.1', resolve);
  });
  async function cleanup() {
    const users = await prisma.user.findMany({
      where: {
        email: { endsWith: '@browser.test', contains: prefix.toLowerCase() },
      },
    });
    const vehicles = await prisma.vehicle.findMany({
      where: { plate: { startsWith: prefix, mode: 'insensitive' } },
    });
    const warehouses = await prisma.warehouse.findMany({
      where: { code: { startsWith: prefix } },
    });
    const items = await prisma.inventoryItem.findMany({
      where: { warehouseId: { in: warehouses.map((w) => w.id) } },
    });
    const shipments = await prisma.shipment.findMany({
      where: { reference: { startsWith: prefix } },
    });
    const userIds = users.map((user) => user.id),
      vehicleIds = vehicles.map((vehicle) => vehicle.id);
    const ids = [
      ...userIds,
      ...vehicleIds,
      ...warehouses.map((w) => w.id),
      ...items.map((item) => item.id),
      ...shipments.map((s) => s.id),
    ];
    const outbox = await prisma.outboxEvent.findMany();
    await prisma.outboxEvent.deleteMany({
      where: {
        id: {
          in: outbox
            .filter((event) =>
              ids.some((id) => JSON.stringify(event.body).includes(id)),
            )
            .map((event) => event.id),
        },
      },
    });
    await prisma.auditLog.deleteMany({
      where: {
        OR: [{ actorId: { in: userIds } }, { targetId: { in: userIds } }],
      },
    });
    await prisma.shipment.deleteMany({
      where: { id: { in: shipments.map((s) => s.id) } },
    });
    await prisma.inventoryItem.deleteMany({
      where: { id: { in: items.map((item) => item.id) } },
    });
    await prisma.warehouse.deleteMany({
      where: { id: { in: warehouses.map((w) => w.id) } },
    });
    await prisma.vehicle.deleteMany({ where: { id: { in: vehicleIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    const mongo = await mongoose
      .createConnection(process.env.MONGODB_URI!)
      .asPromise();
    await mongo
      .db!.collection('vehicle_telemetry')
      .deleteMany({ vehicleId: { $in: vehicleIds } });
    await mongo.close();
    const redis = new Redis(process.env.REDIS_URL!);
    for (const id of vehicleIds) await redis.del('fleet:position:' + id);
    redis.disconnect();
  }
  try {
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
        id: userId,
        email: process.env.BROWSER_TEST_EMAIL!,
        name: 'Browser verification',
        passwordHash: await bcrypt.hash(process.env.BROWSER_TEST_PASSWORD!, 12),
        roles: { connect: { name: 'ADMIN' } },
      },
    });
    await prisma.vehicle.create({
      data: { id: process.env.BROWSER_GPS_VEHICLE_ID!, plate: prefix + '-GPS' },
    });
  } catch (error) {
    await cleanup();
    server.close();
    await prisma.$disconnect();
    throw error;
  }
  return async () => {
    try {
      await cleanup();
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await prisma.$disconnect();
    }
  };
}
