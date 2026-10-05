import { Test } from '@nestjs/testing';
import { FleetService } from './fleet.service.js';
import { PrismaService } from '../infrastructure/database/prisma.service.js';
import { TelemetryRepository } from './infrastructure/telemetry.repository.js';
import { EVENT_BUS } from '../infrastructure/messaging/event-bus.js';
describe('FleetService', () => {
  it('resolves its domain adapters', async () => {
    const module = await Test.createTestingModule({
      providers: [
        FleetService,
        { provide: PrismaService, useValue: {} },
        { provide: TelemetryRepository, useValue: {} },
        { provide: EVENT_BUS, useValue: {} },
      ],
    }).compile();
    expect(module.get(FleetService)).toBeDefined();
  });
});
