import { Test } from '@nestjs/testing';
import { ShipmentsController } from './shipments.controller.js';
import { ShipmentsService } from './shipments.service.js';
import { AccessGuard } from '../auth/access.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
describe('ShipmentsController', () => {
  it('resolves behind authentication and role guards', async () => {
    const module = await Test.createTestingModule({
      controllers: [ShipmentsController],
      providers: [{ provide: ShipmentsService, useValue: {} }],
    })
      .overrideGuard(AccessGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();
    expect(module.get(ShipmentsController)).toBeDefined();
  });
});
