import { UsersService } from './users.service.js';
import type { PrismaService } from '../infrastructure/database/prisma.service.js';
describe('User administration', () => {
  it('rejects passwords beyond bcrypt UTF-8 limit before any database write', async () => {
    const create = vi.fn();
    const service = new UsersService({
      user: { create },
    } as unknown as PrismaService);
    await expect(
      service.create(
        {
          email: 'test@example.com',
          name: 'Test',
          roles: ['VIEWER'],
          password: 'ñ'.repeat(40),
        },
        'actor',
      ),
    ).rejects.toThrow('UTF-8');
    expect(create).not.toHaveBeenCalled();
  });
});
