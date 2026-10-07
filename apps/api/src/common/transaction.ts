import { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../infrastructure/database/prisma.service.js';
import { ConflictException } from '@nestjs/common';
function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
export function transactionWriteConflict(error: unknown): boolean {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2034'
  )
    return true;
  // Prisma 7's driver adapter can surface a commit conflict directly rather than P2034.
  // Match the typed driver cause only: never retry arbitrary validation/connection errors.
  if (!object(error)) return false;
  if (error.name === 'PrismaClientKnownRequestError' && error.code === 'P2034')
    return true;
  if (
    error.name === 'DriverAdapterError' &&
    object(error.cause) &&
    error.cause.kind === 'TransactionWriteConflict'
  )
    return true;
  if (object(error.meta) && object(error.meta.driverAdapterError)) {
    const driver = error.meta.driverAdapterError;
    return (
      driver.name === 'DriverAdapterError' &&
      object(driver.cause) &&
      driver.cause.kind === 'TransactionWriteConflict'
    );
  }
  return false;
}
export async function serializable<T>(
  prisma: PrismaService,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (!transactionWriteConflict(error)) throw error;
    }
  }
  throw new ConflictException('Concurrent change. Reload and try again.');
}
