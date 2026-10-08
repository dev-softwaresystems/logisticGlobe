import { mkdir, writeFile } from 'node:fs/promises';
import { readSheet } from 'read-excel-file/node';
import type { ExecutiveReport } from '@logistics-globe/shared';
import { executivePdf, executiveXlsx } from './executive-renderer.js';
const data: ExecutiveReport = {
  generatedAt: '2026-10-07T12:00:00.000Z',
  timeZone: 'America/Mexico_City',
  period: { from: '2026-10-06T12:00:00.000Z', to: '2026-10-07T12:00:00.000Z' },
  filters: {},
  summary: {
    activeShipments: 500,
    warehouseCapacityPercent: null,
    availableVehicles: 1,
    vehiclesInMaintenance: 2,
    pendingDeliveries: 501,
    highPriorityDeliveries: 3,
    generatedAt: '2026-10-07T12:00:00.000Z',
    inventoryAlerts: [],
    shipmentPeriodComparison: {
      currentCreated: 8,
      previousCreated: 4,
      currentFrom: '2026-09-30T12:00:00.000Z',
      previousFrom: '2026-09-23T12:00:00.000Z',
      to: '2026-10-07T12:00:00.000Z',
    },
  },
  states: [],
  priorities: [],
  fleet: [],
  warehouses: Array.from({ length: 180 }, (_, i) => ({
    name: 'Almacén sintético áéíóú ñ ' + i,
    capacity: 100,
    occupied: i,
  })),
  alerts: [
    {
      sku: '=HYPERLINK("https://invalid.test","demo")',
      warehouse: 'Almacén',
      quantity: 1,
      minimum: 10,
    },
  ],
  health: { checkedAt: '2026-10-07T12:00:00.000Z', components: [] },
  limitations: ['Datos sintéticos para probar paginación, vacío y seguridad.'],
};
describe('Executive file content and extended pagination', () => {
  it('retains date/number/string cells and literal formula-looking content', async () => {
    const buffer = await executiveXlsx(data),
      metrics = await readSheet(buffer, 2),
      alerts = await readSheet(buffer, 8);
    expect(metrics[1][1]).toBe(500);
    expect(metrics[2][1]).toBe('N/D');
    expect(alerts[1][0]).toBe(data.alerts[0].sku);
    const comparisons = await readSheet(buffer, 3);
    expect(
      comparisons.find(
        (row) => row[0] === 'Nuevos envíos: últimos 7 días',
      )?.[1],
    ).toBe(8);
    const info = await readSheet(buffer, 1);
    expect(info.find((row) => row[0] === 'Generación UTC')?.[1]).toBeInstanceOf(
      Date,
    );
    expect(info.find((row) => row[0] === 'Clasificación')?.[1]).toContain(
      'Registros de la base consultada',
    );
  });
  it('renders long tables into a genuine PDF for optional visual QA', async () => {
    const buffer = await executivePdf(data);
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    if (process.env.PDF_VISUAL_SAMPLE === 'true') {
      await mkdir('../../artifacts/closure', { recursive: true });
      await writeFile('../../artifacts/closure/executive-large.pdf', buffer);
    }
  });
});
