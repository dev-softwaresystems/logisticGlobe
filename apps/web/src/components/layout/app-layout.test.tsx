vi.mock('../../hooks/use-realtime', () => ({ useRealtime: () => 'connected' }));
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppLayout } from './app-layout';
import { ProtectedRoute } from '../../routes/protected-route';
vi.mock('../../features/auth/api/auth', () => ({
  logout: vi.fn().mockResolvedValue(undefined),
  restoreSession: vi.fn().mockResolvedValue(null),
}));
afterEach(cleanup);
describe('Logout navigation', () => {
  it('notifies the route guard and clears operational data when the session ends', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    client.setQueryData(['session'], {
      id: 'user',
      email: 'test@local.test',
      name: 'Usuario',
      roles: ['VIEWER'],
    });
    client.setQueryData(['dashboard', 'summary'], { activeShipments: 47 });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/login" element={<h1>Iniciar sesión</h1>} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<h1>Operación</h1>} />
              </Route>
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(
      screen.getByRole('heading', { name: 'Operación' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(
      await screen.findByRole('heading', { name: 'Iniciar sesión' }),
    ).toBeInTheDocument();
    expect(client.getQueryData(['session'])).toBeNull();
    expect(client.getQueryData(['dashboard', 'summary'])).toBeUndefined();
  });
});
