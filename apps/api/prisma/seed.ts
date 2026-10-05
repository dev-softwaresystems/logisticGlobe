import { config } from 'dotenv';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
config({ path: ['.env.local', '.env'], quiet: true });
if (process.env.NODE_ENV === 'production')
  throw new Error('Development seed is disabled in production');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
try {
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (
    password &&
    (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72)
  )
    throw new Error(
      'SEED_ADMIN_PASSWORD must contain at least 12 characters and at most 72 UTF-8 bytes',
    );
  await prisma.$transaction(
    async (tx) => {
      for (const name of [
        'ADMIN',
        'LOGISTICS_ADMIN',
        'FLEET_SUPERVISOR',
        'TRAFFIC_COORDINATOR',
        'WAREHOUSE_MANAGER',
        'VIEWER',
      ] as const)
        await tx.role.upsert({ where: { name }, update: {}, create: { name } });
      if (password) {
        const email = (
          process.env.SEED_ADMIN_EMAIL ?? 'admin@logisticsglobe.local'
        )
          .trim()
          .toLowerCase();
        await tx.user.upsert({
          where: { email },
          update: {},
          create: {
            email,
            name: 'Administrador de desarrollo',
            passwordHash: await bcrypt.hash(password, 12),
            roles: { connect: { name: 'ADMIN' } },
          },
        });
      }
      const warehouse = await tx.warehouse.upsert({
        where: { code: 'DEMO-MEX' },
        update: {},
        create: {
          code: 'DEMO-MEX',
          name: 'Almacén México · demo',
          capacityUnits: 1000,
        },
      });
      for (const [sku, name, quantity, minimumQuantity] of [
        ['DEMO-PALLET', 'Tarimas de transporte', 320, 100],
        ['DEMO-PACK', 'Material de embalaje', 12, 30],
      ] as const) {
        const item = await tx.inventoryItem.upsert({
          where: { warehouseId_sku: { warehouseId: warehouse.id, sku } },
          update: {},
          create: {
            warehouseId: warehouse.id,
            sku,
            name,
            quantity,
            threshold: { create: { minimumQuantity } },
          },
        });
        if (item.quantity < minimumQuantity)
          await tx.inventoryAlert.upsert({
            where: { id: 'demo-alert-pack' },
            update: {},
            create: { id: 'demo-alert-pack', itemId: item.id },
          });
      }
      for (const [plate, status] of [
        ['DEMO-001', 'AVAILABLE'],
        ['DEMO-002', 'ON_ROUTE'],
        ['DEMO-003', 'MAINTENANCE'],
      ] as const)
        await tx.vehicle.upsert({
          where: { plate },
          update: {},
          create: { plate, status },
        });
      for (const [reference, status, priority] of [
        ['DEMO-ENV-001', 'IN_TRANSIT', 'HIGH'],
        ['DEMO-ENV-002', 'PENDING', 'NORMAL'],
        ['DEMO-ENV-003', 'DELIVERED', 'NORMAL'],
      ] as const)
        await tx.shipment.upsert({
          where: { reference },
          update: {},
          create: {
            reference,
            origin: 'Ciudad de México',
            destination: 'Querétaro',
            status,
            priority,
            history: { create: { status } },
          },
        });
    },
    { timeout: 15000 },
  );
  console.log(
    'Development seed completed; existing records preserved. Administrator created only if SEED_ADMIN_PASSWORD was provided.',
  );
} finally {
  await prisma.$disconnect();
}
