import { randomUUID, randomBytes } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import bcrypt from 'bcrypt';
import type { DashboardSummary } from '@logistics-globe/shared';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/config/configure-app.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';
import { DashboardRepository } from '../src/modules/dashboard/infrastructure/dashboard.repository.js';

describe('Local vertical slice (real persistence)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let accessToken: string;
  let refreshCookie: string;
  let password: string;
  const id = randomUUID();
  const email = id + '@integration.local';
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    password = randomBytes(24).toString('hex');
    await prisma.role.upsert({
      where: { name: 'VIEWER' },
      update: {},
      create: { name: 'VIEWER' },
    });
    await prisma.user.create({
      data: {
        id,
        email,
        name: 'Integration test',
        passwordHash: await bcrypt.hash(password, 12),
        roles: { connect: { name: 'VIEWER' } },
      },
    });
    await prisma.warehouse.create({
      data: {
        id,
        code: id,
        name: 'Test warehouse',
        capacityUnits: 1000,
        items: { create: { id, sku: id, name: 'Test item', quantity: 100 } },
      },
    });
    await prisma.vehicle.create({
      data: { id, plate: id, status: 'AVAILABLE' },
    });
    await prisma.shipment.create({
      data: {
        id,
        reference: id,
        origin: 'A',
        destination: 'B',
        status: 'IN_TRANSIT',
        priority: 'HIGH',
      },
    });
  });
  afterAll(async () => {
    if (prisma) {
      await prisma.shipment.deleteMany({ where: { id } });
      await prisma.vehicle.deleteMany({ where: { id } });
      await prisma.inventoryItem.deleteMany({ where: { id } });
      await prisma.warehouse.deleteMany({ where: { id } });
      await prisma.user.deleteMany({ where: { id } });
    }
    if (app) await app.close();
  });
  it('reports liveness and all dependency health without connection details', async () => {
    const live = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);
    expect(live.headers['x-request-id']).toBeTruthy();
    const health = await request(app.getHttpServer())
      .get('/api/v1/health/services')
      .expect(200);
    expect(health.body.status).toBe('up');
    expect(
      health.body.services.map((entry: { name: string }) => entry.name),
    ).toEqual(['api', 'postgresql', 'mongodb', 'redis']);
    expect(JSON.stringify(health.body)).not.toMatch(
      /postgresql:\/\/|mongodb:\/\/|redis:\/\/|password|stack/,
    );
  });
  it('blocks dashboard without credentials', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/dashboard/summary')
      .expect(401);
  });
  it('validates login fields and rejects unknown input', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password, roles: ['ADMIN'] })
      .expect(400);
  });
  it('rejects invalid passwords', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'incorrect' })
      .expect(401);
  });
  it('logs in with HttpOnly refresh cookie and sanitized user', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    accessToken = response.body.accessToken as string;
    const cookies = response.headers['set-cookie'] as unknown as string[];
    expect(cookies[0]).toContain('HttpOnly');
    expect(cookies[0]).toContain('SameSite=Strict');
    refreshCookie = cookies[0].split(';')[0];
    expect(response.body.user.roles).toEqual(['VIEWER']);
    expect(response.body).not.toHaveProperty('refreshToken');
    expect(response.body.user).not.toHaveProperty('passwordHash');
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .auth(accessToken, { type: 'bearer' })
      .expect(200);
  });
  it('aggregates real PostgreSQL records into the dashboard contract', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/dashboard/summary')
      .auth(accessToken, { type: 'bearer' })
      .expect(200);
    const summary = response.body as DashboardSummary;
    const pending = {
      in: ['PENDING', 'IN_TRANSIT'] as ('PENDING' | 'IN_TRANSIT')[],
    };
    expect(summary.activeShipments).toBe(
      await prisma.shipment.count({ where: { status: 'IN_TRANSIT' } }),
    );
    expect(summary.pendingDeliveries).toBe(
      await prisma.shipment.count({ where: { status: pending } }),
    );
    expect(summary.highPriorityDeliveries).toBe(
      await prisma.shipment.count({
        where: { status: pending, priority: 'HIGH' },
      }),
    );
    expect(summary.availableVehicles).toBe(
      await prisma.vehicle.count({ where: { status: 'AVAILABLE' } }),
    );
    expect(summary.vehiclesInMaintenance).toBe(
      await prisma.vehicle.count({ where: { status: 'MAINTENANCE' } }),
    );
    const quantity = await prisma.inventoryItem.aggregate({
      _sum: { quantity: true },
    });
    const capacity = await prisma.warehouse.aggregate({
      _sum: { capacityUnits: true },
    });
    expect(summary.warehouseCapacityPercent).toBe(
      Math.round(
        ((quantity._sum.quantity ?? 0) / (capacity._sum.capacityUnits ?? 1)) *
          1000,
      ) / 10,
    );
  });
  it('does not leak internal errors or sensitive details', async () => {
    const spy = vi
      .spyOn(app.get(DashboardRepository), 'summary')
      .mockRejectedValueOnce(new Error('sensitive-database-connection'));
    const response = await request(app.getHttpServer())
      .get('/api/v1/dashboard/summary')
      .auth(accessToken, { type: 'bearer' })
      .expect(500);
    expect(response.body.message).toBe('Service temporarily unavailable');
    expect(JSON.stringify(response.body)).not.toContain('sensitive-database');
    spy.mockRestore();
  });
  it('authorizes roles from persistence, rather than trusting client claims', async () => {
    await prisma.user.update({ where: { id }, data: { roles: { set: [] } } });
    await request(app.getHttpServer())
      .get('/api/v1/dashboard/summary')
      .auth(accessToken, { type: 'bearer' })
      .expect(403);
    await prisma.user.update({
      where: { id },
      data: { roles: { connect: { name: 'VIEWER' } } },
    });
  });
  it('rejects refresh CSRF and rotates refresh tokens exactly once', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Origin', 'https://foreign.example')
      .set('Cookie', refreshCookie)
      .expect(403);
    const refreshed = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(401);
    accessToken = refreshed.body.accessToken as string;
    refreshCookie = (
      refreshed.headers['set-cookie'] as unknown as string[]
    )[0].split(';')[0];
  });
  it('revokes refresh and access sessions at logout', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', refreshCookie)
      .expect(204);
    await request(app.getHttpServer())
      .get('/api/v1/dashboard/summary')
      .auth(accessToken, { type: 'bearer' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(401);
  });
});
