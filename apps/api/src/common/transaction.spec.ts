import { serializable, transactionWriteConflict } from './transaction.js';
import type { PrismaService } from '../infrastructure/database/prisma.service.js';
describe('Serializable retry through PostgreSQL adapter', () => {
  it('retries typed commit conflicts, bounds retries and never swallows unrelated failures', async () => {
    const conflict = Object.assign(new Error('fixture'), {
      name: 'DriverAdapterError',
      cause: { kind: 'TransactionWriteConflict' },
    });
    const transaction = vi
      .fn()
      .mockRejectedValueOnce(conflict)
      .mockResolvedValueOnce('done');
    expect(
      await serializable(
        { $transaction: transaction } as unknown as PrismaService,
        async () => null,
      ),
    ).toBe('done');
    expect(transaction).toHaveBeenCalledTimes(2);
    transaction.mockReset().mockRejectedValue(conflict);
    await expect(
      serializable(
        { $transaction: transaction } as unknown as PrismaService,
        async () => null,
      ),
    ).rejects.toThrow('Concurrent change');
    expect(transaction).toHaveBeenCalledTimes(3);
    const fatal = Object.assign(new Error('fixture'), {
      name: 'DriverAdapterError',
      cause: { kind: 'ConnectionClosed' },
    });
    transaction.mockReset().mockRejectedValue(fatal);
    await expect(
      serializable(
        { $transaction: transaction } as unknown as PrismaService,
        async () => null,
      ),
    ).rejects.toBe(fatal);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(transactionWriteConflict({ code: 'P2034' })).toBe(false);
  });
});
