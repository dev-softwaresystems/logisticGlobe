import { Test } from '@nestjs/testing';
import { ShipmentsService } from './shipments.service.js';
import { PrismaService } from '../infrastructure/database/prisma.service.js';
describe('ShipmentsService', () => {
  it('resolves its domain adapters', async () => {
    const module = await Test.createTestingModule({
      providers: [ShipmentsService, { provide: PrismaService, useValue: {} }],
    }).compile();
    expect(module.get(ShipmentsService)).toBeDefined();
  });
});
