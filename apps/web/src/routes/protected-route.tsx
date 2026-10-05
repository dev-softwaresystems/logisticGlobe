import { Navigate, Outlet } from 'react-router-dom';
import { useSession } from '../features/auth/hooks/use-session';
import { ErrorState, LoadingState } from '../components/ui/query-state';
export function ProtectedRoute() {
  const session = useSession();
  if (session.isPending) return <LoadingState message="Comprobando sesión…" />;
  if (session.isError)
    return (
      <ErrorState
        message={session.error.message}
        retry={() => {
          void session.refetch();
        }}
      />
    );
  if (!session.data) return <Navigate to="/login" replace />;
  return <Outlet />;
}
