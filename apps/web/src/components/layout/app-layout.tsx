import { useRealtime } from '../../hooks/use-realtime';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Activity,
  Boxes,
  Globe2,
  LayoutDashboard,
  LogOut,
  Package,
  Truck,
} from 'lucide-react';
import { logout } from '../../features/auth/api/auth';
import { useSession } from '../../features/auth/hooks/use-session';
const navigation = [
  { to: '/dashboard', label: 'Resumen', icon: LayoutDashboard },
  { to: '/shipments', label: 'Envíos', icon: Package },
  { to: '/fleet', label: 'Flota', icon: Truck },
  { to: '/inventory', label: 'Inventario', icon: Boxes },
  { to: '/alerts', label: 'Alertas', icon: Activity },
  { to: '/reports', label: 'Reportes', icon: Package },
  { to: '/system', label: 'Estado del sistema', icon: Activity },
  { to: '/routing', label: 'Rutas', icon: Truck },
  { to: '/users', label: 'Usuarios', icon: Activity },
];
export function AppLayout() {
  const realtime = useRealtime();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: user } = useSession();
  const signOut = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      queryClient.setQueryData(['session'], null);
      await queryClient.cancelQueries({
        predicate: (query) => query.queryKey[0] !== 'session',
      });
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== 'session',
      });
      navigate('/login', { replace: true });
    },
  });
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <Globe2 aria-hidden="true" />
          </span>
          <div>
            <strong>LogisticsGlobe</strong>
            <small>Software Systems</small>
          </div>
        </div>
        <p className="nav-caption">OPERACIÓN</p>
        <nav aria-label="Navegación principal">
          {navigation
            .filter(
              (item) => item.to !== '/users' || user?.roles.includes('ADMIN'),
            )
            .map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to}>
                <Icon size={19} aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-footer">
          <span className="avatar" aria-hidden="true">
            {user?.name.slice(0, 1)}
          </span>
          <div>
            <strong>{user?.name}</strong>
            <small>{user?.roles.join(' · ')}</small>
          </div>
        </div>
        <button
          className="logout-button"
          onClick={() => signOut.mutate()}
          disabled={signOut.isPending}
        >
          <LogOut size={16} aria-hidden="true" />
          Cerrar sesión
        </button>
        {signOut.isError && (
          <p role="alert" className="form-error">
            No se pudo cerrar la sesión. Intenta de nuevo.
          </p>
        )}
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>
            Centro de operaciones ·{' '}
            {realtime === 'connected' ? 'En vivo' : 'Reconectando'}
          </span>
          <span className="environment-badge">
            {import.meta.env.DEV ? 'Entorno local' : 'LogisticsGlobe'}
          </span>
        </header>
        <main id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
        <footer className="workspace-footer">
          LogisticsGlobe <span>Software Systems · Plataforma logística</span>
        </footer>
      </div>
    </div>
  );
}
