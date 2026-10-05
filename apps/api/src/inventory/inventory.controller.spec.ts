import { Test } from '@nestjs/testing';
import { InventoryController } from './inventory.controller.js';
import { InventoryService } from './inventory.service.js';
import { AccessGuard } from '../auth/access.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
describe('InventoryController', () => {
  it('resolves behind authentication and role guards', async () => {
    const module = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [{ provide: InventoryService, useValue: {} }],
    })
      .overrideGuard(AccessGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();
    expect(module.get(InventoryController)).toBeDefined();
  });
});
