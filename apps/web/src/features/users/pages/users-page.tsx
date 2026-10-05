import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ManagedUser } from '@logistics-globe/shared';
import { useSession } from '../../auth/hooks/use-session';
import { listUsers, listRoles, getUserAudit } from '../api/users';
import { UserForm } from '../components/user-form';
import { Pagination } from '../../../components/ui/pagination';
import { QueryState } from '../../../components/ui/query-state';
export function UsersPage() {
  const session = useSession();
  if (!session.data?.roles.includes('ADMIN'))
    return (
      <section className="panel">
        <h1>Acceso restringido</h1>
        <p>La administración de usuarios requiere el rol ADMIN.</p>
      </section>
    );
  return <UsersAdministration />;
}
function UsersAdministration() {
  const [search, setSearch] = useState(''),
    [state, setState] = useState(''),
    [page, setPage] = useState(1);
  const [editing, setEditing] = useState<ManagedUser | null | undefined>(),
    [auditId, setAuditId] = useState<string>();
  const [auditPage, setAuditPage] = useState(1);
  const users = useQuery({
    queryKey: ['users', { search, state, page }],
    queryFn: () => listUsers({ search, state, page }),
  });
  const roles = useQuery({ queryKey: ['users', 'roles'], queryFn: listRoles });
  const audit = useQuery({
    queryKey: ['users', 'audit', auditId, auditPage],
    queryFn: () => getUserAudit(auditId!, auditPage),
    enabled: !!auditId,
  });
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">CONTROL DE ACCESO</p>
          <h1>Usuarios</h1>
          <p>Permisos y actividad de las cuentas de LogisticsGlobe.</p>
        </div>
        <button className="primary-button" onClick={() => setEditing(null)}>
          Crear usuario
        </button>
      </div>
      {editing !== undefined && roles.data && (
        <UserForm
          key={editing?.id ?? 'new'}
          user={editing ?? undefined}
          roles={roles.data}
          onDone={() => setEditing(undefined)}
        />
      )}
      {roles.isError && (
        <p role="alert">No se pudo cargar el catálogo de roles.</p>
      )}
      <div className="filters">
        <label>
          Buscar usuario
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          Estado de cuenta
          <select
            value={state}
            onChange={(event) => {
              setState(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Todas</option>
            <option value="active">Activas</option>
            <option value="inactive">Inactivas</option>
          </select>
        </label>
      </div>
      <QueryState
        isLoading={users.isLoading}
        error={users.error}
        isEmpty={users.data?.total === 0}
        onRetry={() => void users.refetch()}
        emptyMessage="No hay usuarios para estos filtros."
      />
      {users.data && (
        <section className="panel table-container">
          <table>
            <caption>Usuarios registrados</caption>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Roles</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.data.items.map((user) => (
                <tr key={user.id}>
                  <td>
                    {user.name}
                    <small>{user.email}</small>
                  </td>
                  <td>{user.roles.join(' · ')}</td>
                  <td>{user.active ? 'Activa' : 'Inactiva'}</td>
                  <td>
                    <button
                      className="text-button"
                      onClick={() => setEditing(user)}
                    >
                      Editar
                    </button>
                    <button
                      className="text-button"
                      onClick={() => {
                        setAuditId(user.id);
                        setAuditPage(1);
                      }}
                    >
                      Ver cambios
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            page={page}
            pageSize={users.data.pageSize}
            total={users.data.total}
            onPage={setPage}
          />
        </section>
      )}
      {auditId && (
        <section className="panel users-history">
          <h2>Cambios de permisos</h2>
          <button className="text-button" onClick={() => setAuditId(undefined)}>
            Cerrar historial
          </button>
          <QueryState
            isLoading={audit.isLoading}
            error={audit.error}
            isEmpty={audit.data?.total === 0}
            onRetry={() => void audit.refetch()}
            emptyMessage="Sin cambios registrados."
          />
          {audit.data && (
            <ul>
              {audit.data.items.map((entry) => (
                <li key={entry.id}>
                  {entry.action === 'user.created'
                    ? 'Cuenta creada'
                    : 'Cuenta actualizada'}{' '}
                  · {new Date(entry.createdAt).toLocaleString('es-MX')} · Roles:{' '}
                  {entry.changes.roles?.join(', ')} ·{' '}
                  {entry.changes.active ? 'Activa' : 'Inactiva'}
                </li>
              ))}
            </ul>
          )}
          {audit.data && (
            <Pagination
              page={auditPage}
              pageSize={audit.data.pageSize}
              total={audit.data.total}
              onPage={setAuditPage}
            />
          )}
        </section>
      )}
    </>
  );
}
