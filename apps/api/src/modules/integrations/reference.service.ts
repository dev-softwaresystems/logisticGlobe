import {
  ConflictException,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { createHash } from 'node:crypto';
import type { ImportResult } from '@logistics-globe/shared';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { InventoryService } from '../../inventory/inventory.service.js';
import { serializable } from '../../common/transaction.js';
import { ReferenceStockDto } from './reference.dto.js';
@Injectable()
export class ReferenceStockService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(InventoryService) private readonly inventory: InventoryService,
  ) {}
  async import(
    records: unknown[],
    actorId: string,
  ): Promise<{ mode: 'local-reference'; results: ImportResult[] }> {
    const results: ImportResult[] = [];
    for (let index = 0; index < records.length; index++) {
      const raw = records[index];
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        results.push({
          externalId: 'row-' + (index + 1),
          status: 'invalid',
          reason: 'Invalid record shape',
        });
        continue;
      }
      const dto = plainToInstance(ReferenceStockDto, raw);
      const errors = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });
      if (
        errors.length ||
        new Date(dto.observedAt).getTime() > Date.now() + 60000
      ) {
        results.push({
          externalId:
            typeof dto.externalId === 'string'
              ? dto.externalId.slice(0, 80)
              : 'row-' + (index + 1),
          status: 'invalid',
          reason: 'Invalid fields or timestamp',
        });
        continue;
      }
      const fingerprint = createHash('sha256')
        .update(
          JSON.stringify([
            dto.externalId,
            dto.version,
            new Date(dto.observedAt).toISOString(),
            dto.warehouseCode,
            dto.sku,
            dto.quantity,
            dto.minimumQuantity,
            new Date(dto.expectedUpdatedAt).toISOString(),
          ]),
        )
        .digest('hex');
      try {
        results.push(
          await serializable(this.prisma, async (tx) => {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'reference-stock:' + dto.externalId}))`;
            const prior = await tx.integrationReceipt.findUnique({
              where: {
                source_externalId_version: {
                  source: 'reference-stock',
                  externalId: dto.externalId,
                  version: dto.version,
                },
              },
            });
            if (prior) {
              if (prior.fingerprint !== fingerprint)
                throw new ConflictException('Idempotency payload mismatch');
              return {
                externalId: dto.externalId,
                status: 'duplicate' as const,
                receiptId: prior.id,
              };
            }
            const last = await tx.integrationReceipt.findFirst({
              where: { source: 'reference-stock', externalId: dto.externalId },
              orderBy: { version: 'desc' },
            });
            if (
              last &&
              (last.version >= dto.version ||
                last.observedAt > new Date(dto.observedAt))
            )
              throw new ConflictException(
                'Obsolete external version or observation',
              );
            const item = await tx.inventoryItem.findFirst({
              where: { sku: dto.sku, warehouse: { code: dto.warehouseCode } },
              select: { id: true },
            });
            if (!item) throw new NotFoundException('Unknown SKU or warehouse');
            if (
              last &&
              typeof last.result === 'object' &&
              last.result !== null &&
              !Array.isArray(last.result) &&
              last.result.itemId !== item.id
            )
              throw new ConflictException(
                'External identifier cannot change item mapping',
              );
            await this.inventory.adjustInTransaction(
              tx,
              item.id,
              {
                quantity: dto.quantity,
                minimumQuantity: dto.minimumQuantity,
                expectedUpdatedAt: dto.expectedUpdatedAt,
                reason: 'Validated local reference stock exchange',
              },
              actorId,
            );
            const receipt = await tx.integrationReceipt.create({
              data: {
                source: 'reference-stock',
                externalId: dto.externalId,
                version: dto.version,
                fingerprint,
                status: 'accepted',
                actorId,
                observedAt: new Date(dto.observedAt),
                result: { itemId: item.id, quantity: dto.quantity },
              },
            });
            return {
              externalId: dto.externalId,
              status: 'accepted' as const,
              receiptId: receipt.id,
            };
          }),
        );
      } catch (error) {
        if (!(error instanceof HttpException)) throw error;
        results.push({
          externalId: dto.externalId,
          status: error.getStatus() === 409 ? 'conflict' : 'invalid',
          reason:
            error.getStatus() === 409
              ? 'Version, ordering or idempotency conflict'
              : 'Unknown SKU or warehouse',
        });
      }
    }
    return { mode: 'local-reference', results };
  }
}
