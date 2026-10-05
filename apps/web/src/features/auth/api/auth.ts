import axios from 'axios';
import type { CurrentUser, LoginResponse } from '@logistics-globe/shared';
import { http, refreshSession, setAccessToken } from '../../../services/http';
export async function restoreSession(): Promise<CurrentUser | null> {
  try {
    return (await refreshSession()).user;
  } catch (error) {
    setAccessToken(null);
    if (axios.isAxiosError(error) && error.response?.status === 401)
      return null;
    throw new Error(
      'No se pudo comprobar la sesión. Verifica que la API esté disponible.',
      { cause: error },
    );
  }
}
export async function login(
  email: string,
  password: string,
): Promise<CurrentUser> {
  const { data } = await http.post<LoginResponse>('/auth/login', {
    email,
    password,
  });
  setAccessToken(data.accessToken);
  return data.user;
}
export async function logout(): Promise<void> {
  await http.post('/auth/logout');
  setAccessToken(null);
}
