import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import type { Request, Response } from 'express';
describe('AuthController origin boundary', () => {
  it('rejects foreign origins before attempting authentication', async () => {
    const login = vi.fn();
    const controller = new AuthController(
      { login } as unknown as AuthService,
      new ConfigService({ WEB_ORIGIN: 'http://localhost:5173' }),
    );
    await expect(
      controller.login(
        { email: 'test@example.com', password: 'irrelevant' },
        { header: () => 'https://foreign.example' } as unknown as Request,
        {} as Response,
      ),
    ).rejects.toThrow('Origin not allowed');
    expect(login).not.toHaveBeenCalled();
  });
});
