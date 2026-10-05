import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import type { LoginResponse } from '@logistics-globe/shared';
import { environment } from '../lib/environment';
import { queryClient } from '../lib/query-client';
export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}
let accessToken: string | null = null;
export function getAccessToken(): string | null {
  return accessToken;
}
export function setAccessToken(token: string | null): void {
  accessToken = token;
}
const transport = axios.create({
  baseURL: environment.apiUrl,
  withCredentials: true,
  timeout: 10000,
});
export const http = axios.create({
  baseURL: environment.apiUrl,
  withCredentials: true,
  timeout: 10000,
});
let refreshing: Promise<LoginResponse> | null = null;
export async function refreshSession(): Promise<LoginResponse> {
  if (!refreshing) {
    refreshing = transport
      .post<LoginResponse>('/auth/refresh')
      .then(({ data }) => {
        setAccessToken(data.accessToken);
        return data;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}
http.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = 'Bearer ' + accessToken;
  return config;
});
http.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) throw error;
    const config = error.config as
      (InternalAxiosRequestConfig & { retried?: boolean }) | undefined;
    if (
      error.response?.status === 401 &&
      config &&
      !config.retried &&
      !config.url?.startsWith('/auth/')
    ) {
      config.retried = true;
      try {
        await refreshSession();
        return await http.request(config);
      } catch {
        setAccessToken(null);
        queryClient.setQueryData(['session'], null);
        queryClient.removeQueries({
          predicate: (query) => query.queryKey[0] !== 'session',
        });
      }
    }
    const status = error.response?.status ?? 0;
    throw new ApiError(
      status,
      status === 401
        ? 'La sesión expiró o las credenciales son incorrectas.'
        : status === 403
          ? 'No tienes permiso para consultar esta información.'
          : status === 429
            ? 'Demasiados intentos. Espera un minuto y vuelve a intentar.'
            : status === 400
              ? 'Revisa los datos del formulario.'
              : status === 409
                ? 'La información cambió o el identificador ya está en uso. Actualiza y revisa los datos.'
                : status === 404
                  ? 'El registro solicitado no existe.'
                  : 'No pudimos conectar con el servicio. Intenta de nuevo.',
    );
  },
);
