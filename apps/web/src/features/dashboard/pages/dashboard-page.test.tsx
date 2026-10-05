import { listVehicles } from '../../fleet/api/fleet';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DashboardPage } from './dashboard-page';
import { getDashboardSummary } from '../api/dashboard';
import { getServicesHealth } from '../../system-health/api/system-health';
vi.mock('../../fleet/api/fleet');
vi.mock('../api/dashboard');
vi.mock('../../system-health/api/system-health');
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
function renderDashboard() {
  vi.mocked(listVehicles).mockResolvedValue({
    items: [],
    total: 0,
    page: 1,
    pageSize: 100,
  });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
describe('Dashboard integration', () => {
  it('renders API metrics and empty inventory/map states', async () => {
    vi.mocked(getDashboardSummary).mockResolvedValue({
      activeShipments: 47,
      warehouseCapacityPercent: 33.2,
      availableVehicles: 8,
      vehiclesInMaintenance: 2,
      pendingDeliveries: 17,
      highPriorityDeliveries: 3,
      inventoryAlerts: [],
      generatedAt: new Date().toISOString(),
    });
    vi.mocked(getServicesHealth).mockResolvedValue({
      status: 'up',
      services: [],
      checkedAt: new Date().toISOString(),
    });
    renderDashboard();
    expect(await screen.findByText('47')).toBeInTheDocument();
    expect(screen.getByText('33.2%')).toBeInTheDocument();
    expect(screen.getByText('Sin alertas recientes')).toBeInTheDocument();
    expect(
      await screen.findByText('Sin telemetría conectada'),
    ).toBeInTheDocument();
  });
  it('shows a loading state while waiting for the API', () => {
    vi.mocked(getDashboardSummary).mockImplementation(
      () => new Promise(() => {}),
    );
    renderDashboard();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Consultando métricas',
    );
  });
  it('shows an actionable error when the API is unavailable', async () => {
    vi.mocked(getDashboardSummary).mockRejectedValue(
      new Error('Servicio no disponible'),
    );
    renderDashboard();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Servicio no disponible',
    );
    expect(
      screen.getByRole('button', { name: 'Volver a intentar' }),
    ).toBeInTheDocument();
  });
});
