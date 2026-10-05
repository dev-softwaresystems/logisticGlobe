export function warehouseCapacityPercent(
  totalQuantity: number,
  totalCapacity: number,
): number | null {
  if (totalCapacity <= 0) return null;
  return Math.round((totalQuantity / totalCapacity) * 1000) / 10;
}
