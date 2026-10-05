import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'node:crypto';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../infrastructure/database/prisma.service.js';
import { validateEnvironment } from '../config/environment.js';
describe('AuthService token boundaries', () => {
  it('rejects malformed access tokens before consulting persistence', async () => {
    const findUnique = vi.fn();
    const config = validateEnvironment({
      DATABASE_URL: 'postgresql://localhost/logistics',
      JWT_ACCESS_SECRET: randomBytes(32).toString('hex'),
      JWT_REFRESH_SECRET: randomBytes(32).toString('hex'),
    });
    const service = new AuthService(
      { refreshSession: { findUnique } } as unknown as PrismaService,
      new JwtService(),
      new ConfigService(config),
    );
    await expect(service.authenticate('invalid')).rejects.toThrow(
      'Invalid or expired session',
    );
    expect(findUnique).not.toHaveBeenCalled();
  });
});
