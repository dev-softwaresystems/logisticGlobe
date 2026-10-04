import { Test, TestingModule } from '@nestjs/testing';
import { FleetController } from './fleet.controller.js';

describe('FleetController', () => {
  let controller: FleetController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FleetController],
    }).compile();

    controller = module.get<FleetController>(FleetController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
