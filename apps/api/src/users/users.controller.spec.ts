import { UsersController } from './users.controller.js';
import type { UsersService } from './users.service.js';
describe('UsersController', () => {
  it('exposes the six supported roles', () => {
    const controller = new UsersController({} as UsersService);
    expect(controller.roles()).toEqual([
      'ADMIN',
      'LOGISTICS_ADMIN',
      'FLEET_SUPERVISOR',
      'TRAFFIC_COORDINATOR',
      'WAREHOUSE_MANAGER',
      'VIEWER',
    ]);
  });
});
