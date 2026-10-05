import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ManagedUser, RoleName } from '@logistics-globe/shared';
import { createUser, updateUser } from '../api/users';
export function UserForm({
  user,
  roles,
  onDone,
}: {
  user?: ManagedUser;
  roles: RoleName[];
  onDone: () => void;
}) {
  const [version] = useState(user?.updatedAt);
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const selected = data
        .getAll('roles')
        .filter((value): value is RoleName =>
          roles.includes(value as RoleName),
        );
      const name = String(data.get('name')).trim();
      if (!selected.length) throw new Error('Selecciona al menos un rol.');
      if (user)
        return updateUser({
          id: user.id,
          name,
          roles: selected,
          active: data.get('active') === 'on',
          expectedUpdatedAt: version!,
        });
      const password = String(data.get('password'));
      if (new TextEncoder().encode(password).length > 72)
        throw new Error('La contraseña debe tener como máximo 72 bytes UTF-8.');
      return createUser({
        email: String(data.get('email')),
        name,
        password,
        roles: selected,
      });
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['users'] });
      onDone();
    },
  });
  return (
    <form
      className="operation-form panel"
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate(new FormData(event.currentTarget));
      }}
    >
      <h2>{user ? 'Editar usuario' : 'Crear usuario'}</h2>
      <label>
        Nombre
        <input
          name="name"
          required
          minLength={2}
          maxLength={100}
          defaultValue={user?.name}
        />
      </label>
      {user ? (
        <p>{user.email}</p>
      ) : (
        <>
          <label>
            Correo electrónico
            <input
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="off"
            />
          </label>
          <label>
            Contraseña inicial
            <input
              name="password"
              type="password"
              required
              minLength={12}
              maxLength={72}
              autoComplete="new-password"
            />
          </label>
        </>
      )}
      <fieldset>
        <legend>Roles</legend>
        {roles.map((role) => (
          <label className="checkbox-label" key={role}>
            <input
              type="checkbox"
              name="roles"
              value={role}
              defaultChecked={
                user ? user.roles.includes(role) : role === 'VIEWER'
              }
            />
            {role}
          </label>
        ))}
      </fieldset>
      {user && (
        <label className="checkbox-label">
          <input name="active" type="checkbox" defaultChecked={user.active} />
          Cuenta activa
        </label>
      )}
      {user && (
        <p>
          Los cambios de permisos cierran las sesiones del usuario. Siempre debe
          quedar un administrador activo.
        </p>
      )}
      {mutation.isError && (
        <p className="form-error" role="alert">
          {mutation.error.message}
        </p>
      )}
      <div className="form-actions">
        <button className="primary-button" disabled={mutation.isPending}>
          {mutation.isPending ? 'Guardando…' : 'Guardar usuario'}
        </button>
        <button type="button" className="secondary-button" onClick={onDone}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
