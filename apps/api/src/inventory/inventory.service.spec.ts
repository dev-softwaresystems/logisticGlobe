import { Test } from '@nestjs/testing';
import { InventoryService } from './inventory.service.js';
import { PrismaService } from '../infrastructure/database/prisma.service.js';
describe('InventoryService', () => {
  it('resolves its domain adapters', async () => {
    const module = await Test.createTestingModule({
      providers: [InventoryService, { provide: PrismaService, useValue: {} }],
    }).compile();
    expect(module.get(InventoryService)).toBeDefined();
  });
});
