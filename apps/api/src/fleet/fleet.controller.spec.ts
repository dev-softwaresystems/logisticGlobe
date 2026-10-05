import { Test } from '@nestjs/testing';
import { FleetController } from './fleet.controller.js';
import { FleetService } from './fleet.service.js';
import { AccessGuard } from '../auth/access.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
describe('FleetController', () => {
  it('resolves behind authentication and role guards', async () => {
    const module = await Test.createTestingModule({
      controllers: [FleetController],
      providers: [{ provide: FleetService, useValue: {} }],
    })
      .overrideGuard(AccessGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();
    expect(module.get(FleetController)).toBeDefined();
  });
});
