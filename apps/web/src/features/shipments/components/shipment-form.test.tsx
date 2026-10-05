import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, it, expect, vi } from 'vitest';
import { ShipmentForm } from './shipment-form';
import { createShipment } from '../api/shipments';
import { listVehicles } from '../../fleet/api/fleet';
vi.mock('../api/shipments');
vi.mock('../../fleet/api/fleet');
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it('registers user input through the mutation and excludes maintenance vehicles', async () => {
  vi.mocked(listVehicles).mockResolvedValue({
    items: [
      {
        id: 'maintenance',
        plate: 'MANT-001',
        status: 'MAINTENANCE',
        createdAt: '',
        updatedAt: '',
        position: null,
      },
      {
        id: 'ready',
        plate: 'LISTO-001',
        status: 'AVAILABLE',
        createdAt: '',
        updatedAt: '',
        position: null,
      },
    ],
    total: 2,
    page: 1,
    pageSize: 100,
  });
  vi.mocked(createShipment).mockResolvedValue({
    id: 'shipment',
    reference: 'ENV-001',
    origin: 'México',
    destination: 'Puebla',
    status: 'PENDING',
    priority: 'HIGH',
    vehicleId: 'ready',
    createdAt: '',
    updatedAt: '',
  });
  const done = vi.fn();
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ShipmentForm onCreated={done} />
    </QueryClientProvider>,
  );
  await screen.findByRole('option', { name: 'LISTO-001' });
  expect(
    screen.queryByRole('option', { name: 'MANT-001' }),
  ).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Referencia única'), {
    target: { value: 'ENV-001' },
  });
  fireEvent.change(screen.getByLabelText('Origen'), {
    target: { value: 'México' },
  });
  fireEvent.change(screen.getByLabelText('Destino'), {
    target: { value: 'Puebla' },
  });
  fireEvent.change(screen.getByLabelText('Prioridad'), {
    target: { value: 'HIGH' },
  });
  fireEvent.change(screen.getByLabelText('Vehículo'), {
    target: { value: 'ready' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar envío' }));
  await waitFor(() =>
    expect(createShipment).toHaveBeenCalledWith(
      {
        reference: 'ENV-001',
        origin: 'México',
        destination: 'Puebla',
        priority: 'HIGH',
        vehicleId: 'ready',
      },
      expect.anything(),
    ),
  );
  await waitFor(() => expect(done).toHaveBeenCalled());
});
