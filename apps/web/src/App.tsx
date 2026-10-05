import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/app-layout';
import { LoginPage } from './features/auth/pages/login-page';
import { DashboardPage } from './features/dashboard/pages/dashboard-page';
import { SystemPage } from './features/system-health/pages/system-page';
import { ShipmentsPage } from './features/shipments/pages/shipments-page';
import { ShipmentPage } from './features/shipments/pages/shipment-page';
import { FleetPage } from './features/fleet/pages/fleet-page';
import { InventoryPage } from './features/inventory/pages/inventory-page';
import { AlertsPage } from './features/alerts/pages/alerts-page';
import { ReportsPage } from './features/reports/pages/reports-page';
import { PlaceholderPage } from './routes/placeholder-page';
import { ProtectedRoute } from './routes/protected-route';
import { UsersPage } from './features/users/pages/users-page';
import { RoutingPage } from './features/routing/pages/routing-page';
import './App.css';
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/shipments" element={<ShipmentsPage />} />
            <Route path="/shipments/:id" element={<ShipmentPage />} />
            <Route path="/fleet" element={<FleetPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/system" element={<SystemPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/routing" element={<RoutingPage />} />
            <Route
              path="*"
              element={
                <PlaceholderPage
                  title="Página no encontrada"
                  description="La ruta solicitada no está disponible."
                />
              }
            />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
