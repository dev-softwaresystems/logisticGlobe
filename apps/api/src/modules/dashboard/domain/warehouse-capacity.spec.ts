import { warehouseCapacityPercent } from './warehouse-capacity.js';
describe('Warehouse occupancy', () => {
  it('reports weighted total capacity with one decimal', () => {
    expect(warehouseCapacityPercent(332, 1000)).toBe(33.2);
  });
  it('distinguishes missing capacity from empty inventory', () => {
    expect(warehouseCapacityPercent(0, 0)).toBeNull();
    expect(warehouseCapacityPercent(0, 1000)).toBe(0);
  });
  it('does not hide overcapacity', () => {
    expect(warehouseCapacityPercent(1200, 1000)).toBe(120);
  });
});
