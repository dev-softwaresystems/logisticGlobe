import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Globe2, ArrowRight, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const mutation = useMutation({
    mutationFn: () => login(email, password),
    onSuccess: (user) => {
      setPassword('');
      queryClient.setQueryData(['session'], user);
      navigate('/dashboard', { replace: true });
    },
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate();
  }
  return (
    <main className="login-page">
      <section className="login-intro">
        <div className="brand">
          <span className="brand-mark">
            <Globe2 aria-hidden="true" />
          </span>
          <strong>LogisticsGlobe</strong>
        </div>
        <p className="eyebrow">SOFTWARE SYSTEMS · CENTRO DE OPERACIONES</p>
        <h1>
          Tu operación,
          <br />
          en perspectiva.
        </h1>
        <p>Supervisa envíos, capacidad y flota desde un solo lugar.</p>
        <div className="login-security">
          <ShieldCheck aria-hidden="true" />
          <span>Acceso autorizado por roles</span>
        </div>
      </section>
      <section className="login-panel">
        <form onSubmit={submit}>
          <p className="eyebrow">ACCESO A LA PLATAFORMA</p>
          <h2>Iniciar sesión</h2>
          <p className="muted">Ingresa con tu cuenta de LogisticsGlobe.</p>
          <label htmlFor="email">Correo electrónico</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={72}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {mutation.isError && (
            <p role="alert" className="form-error">
              {mutation.error.message}
            </p>
          )}
          <button
            className="primary-button"
            disabled={mutation.isPending}
            type="submit"
          >
            {mutation.isPending
              ? 'Ingresando…'
              : 'Entrar al centro de operaciones'}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
          <p className="login-note">
            El administrador de desarrollo se crea mediante el seed local con
            una contraseña configurada por el desarrollador.
          </p>
        </form>
        <p className="copyright">
          Sistemas de Software de México, S.A. de C.V.
        </p>
      </section>
    </main>
  );
}
