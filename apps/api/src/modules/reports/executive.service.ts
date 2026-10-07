import {
  BadRequestException,
  Inject,
  Injectable,
  HttpException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ExecutiveReport } from '@logistics-globe/shared';
import { Temporal } from '@js-temporal/polyfill';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import type { RuntimeEnvironment } from '../../config/environment.js';
import { readDashboard } from '../dashboard/infrastructure/dashboard.repository.js';
import { OperationalHealthService } from '../system-health/operational-health.service.js';
import { executivePdf, executiveXlsx } from './executive-renderer.js';
import type { ExecutiveQuery } from './executive.dto.js';
@Injectable()
export class ExecutiveService {
  private running = 0;
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService)
    private readonly config: ConfigService<RuntimeEnvironment, true>,
    @Inject(OperationalHealthService)
    private readonly health: OperationalHealthService,
  ) {}
  async data(query: ExecutiveQuery): Promise<ExecutiveReport> {
    const now = new Date(),
      timeZone = this.config.get('OPERATION_TIME_ZONE', { infer: true }),
      local = Temporal.Instant.from(now.toISOString()).toZonedDateTimeISO(
        timeZone,
      );
    const from = query.from
        ? new Date(query.from)
        : new Date(local.startOfDay().toInstant().toString()),
      to = query.to ? new Date(query.to) : now;
    if (from > to || to > now || to.getTime() - from.getTime() > 31 * 86400000)
      throw new BadRequestException(
        'Report period must be ordered, not future and at most 31 days',
      );
    const sql = await this.prisma.$transaction(
      async (tx) => {
        const summary = await readDashboard(tx, now, timeZone);
        const where = {
          status: query.status,
          priority: query.priority,
          createdAt: { gte: from, lte: to },
        };
        const [states, priorities, fleet, warehouses, alerts, occupied] =
          await Promise.all([
            tx.shipment.groupBy({ by: ['status'], where, _count: true }),
            tx.shipment.groupBy({ by: ['priority'], where, _count: true }),
            tx.vehicle.groupBy({ by: ['status'], _count: true }),
            tx.warehouse.findMany({
              orderBy: { code: 'asc' },
              take: 1001,
            }),
            tx.inventoryAlert.findMany({
              where: { resolvedAt: null },
              take: 1001,
              orderBy: { createdAt: 'desc' },
              include: {
                item: { include: { warehouse: true, threshold: true } },
              },
            }),
            tx.inventoryItem.groupBy({
              by: ['warehouseId'],
              _sum: { quantity: true },
            }),
          ]);
        if (warehouses.length > 1000 || alerts.length > 1000)
          throw new UnprocessableEntityException(
            'Executive report exceeds 1000 warehouses or alerts',
          );
        return {
          summary,
          states: states.map((r) => ({ name: r.status, count: r._count })),
          priorities: priorities.map((r) => ({
            name: r.priority,
            count: r._count,
          })),
          fleet: fleet.map((r) => ({ name: r.status, count: r._count })),
          warehouses: warehouses.map((r) => ({
            name: r.name,
            capacity: r.capacityUnits,
            occupied:
              occupied.find((item) => item.warehouseId === r.id)?._sum
                .quantity ?? 0,
          })),
          alerts: alerts.map((r) => ({
            sku: r.item.sku,
            warehouse: r.item.warehouse.name,
            quantity: r.item.quantity,
            minimum: r.item.threshold?.minimumQuantity ?? 0,
          })),
        };
      },
      { isolationLevel: 'RepeatableRead', timeout: 5000 },
    );
    return {
      generatedAt: now.toISOString(),
      timeZone,
      period: { from: from.toISOString(), to: to.toISOString() },
      filters: { status: query.status, priority: query.priority },
      ...sql,
      health: await this.health.inspect(),
      limitations: [
        'Flujos: envíos creados dentro del periodo y filtros. Sus estados/prioridades son al corte, no un historial del periodo.',
        'Las seis métricas, flota, stock, capacidad y alertas son globales y actuales al corte SQL.',
        'Salud obtenida por sondas independientes con su propia fecha; no forma parte de la transacción SQL.',
        'Datos demo identificados con DEMO; sin proveedor aprobado no hay validación externa.',
        'Comparativa diaria basada en snapshots observados; N/D indica ausencia de histórico o porcentaje no definido.',
      ],
    };
  }
  async download(format: 'pdf' | 'xlsx', query: ExecutiveQuery) {
    if (this.running >= 2)
      throw new HttpException('Executive export busy; retry later', 429);
    this.running++;
    const work = (async () => {
      const data = await this.data(query);
      const buffer =
        format === 'pdf' ? await executivePdf(data) : await executiveXlsx(data);
      if (buffer.byteLength > 8 * 1024 * 1024)
        throw new UnprocessableEntityException('Report exceeds 8 MiB');
      return buffer;
    })();
    // Keep the concurrency slot until the bounded renderer actually completes,
    // even if HTTP timeout fires. A client timeout cannot release a busy slot.
    void work
      .finally(() => {
        this.running--;
      })
      .catch(() => undefined);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(
        () =>
          reject(new HttpException('Report generation deadline exceeded', 503)),
        10000,
      );
      timer.unref();
    });
    try {
      return await Promise.race([work, timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
