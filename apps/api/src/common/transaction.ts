import { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../infrastructure/database/prisma.service.js';
import { ConflictException } from '@nestjs/common';
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
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2034'
      )
        throw error;
    }
  }
  throw new ConflictException('Concurrent change. Reload and try again.');
}
