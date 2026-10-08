import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PositionDto } from './fleet.dto.js';
import { FleetController } from './fleet.controller.js';
import type { FleetService } from './fleet.service.js';
import type { AuthenticatedRequest } from '../auth/access.guard.js';
describe('Manual observation quality and provenance', () => {
  it('rejects invalid coordinates, units and optional fields', async () => {
    const base = {
      id: '15b6f940-9f23-462c-bbe6-84e581810c74',
      latitude: 19,
      longitude: -99,
      observedAt: new Date().toISOString(),
    };
    expect(
      await validate(
        plainToInstance(PositionDto, {
          ...base,
          speedKph: 30,
          headingDegrees: 90,
          accuracyMeters: 12,
        }),
      ),
    ).toHaveLength(0);
    for (const bad of [
      { latitude: 91 },
      { longitude: -181 },
      { speedKph: -1 },
      { headingDegrees: 360 },
      { accuracyMeters: -1 },
      { observedAt: 'invalid' },
    ])
      expect(
        (await validate(plainToInstance(PositionDto, { ...base, ...bad })))
          .length,
      ).toBeGreaterThan(0);
  });
  it('records manual actor on the server and rejects explicit simulations in production', async () => {
    const position = vi.fn();
    const controller = new FleetController({
      position,
    } as unknown as FleetService);
    const req = { user: { id: 'actor' } } as unknown as AuthenticatedRequest;
    const dto = plainToInstance(PositionDto, { id: 'a' });
    await controller.position('v', dto, req);
    expect(position).toHaveBeenCalledWith('v', dto, {
      source: 'manual',
      actorId: 'actor',
    });
    const previous = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      expect(() =>
        controller.position(
          'v',
          plainToInstance(PositionDto, { id: 'a', simulated: true }),
          req,
        ),
      ).toThrow('Simulation is disabled in production');
    } finally {
      process.env.NODE_ENV = previous;
    }
  });
});
