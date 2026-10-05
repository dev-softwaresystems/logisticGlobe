import axios, { AxiosError } from 'axios';
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import { afterEach, expect, it, vi } from 'vitest';
const originalAdapter = axios.defaults.adapter;
afterEach(() => {
  axios.defaults.adapter = originalAdapter;
  vi.resetModules();
});
it('restores an operational request from the HttpOnly session even when the access token is absent', async () => {
  const seen: InternalAxiosRequestConfig[] = [];
  const adapter: AxiosAdapter = async (config) => {
    seen.push(config);
    if (config.url === '/auth/refresh')
      return {
        data: {
          accessToken: 'restored-access',
          user: {
            id: 'user',
            name: 'Local',
            email: 'local@test',
            roles: ['VIEWER'],
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    if (config.headers.Authorization !== 'Bearer restored-access')
      throw new AxiosError(
        'Unauthorized',
        'ERR_BAD_REQUEST',
        config,
        undefined,
        {
          data: {},
          status: 401,
          statusText: 'Unauthorized',
          headers: {},
          config,
        },
      );
    return {
      data: 'Reference,Status',
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  };
  axios.defaults.adapter = adapter;
  const { http, setAccessToken } = await import('./http');
  setAccessToken(null);
  expect((await http.get('/reports/shipments.csv')).data).toBe(
    'Reference,Status',
  );
  expect(seen.map((config) => config.url)).toEqual([
    '/reports/shipments.csv',
    '/auth/refresh',
    '/reports/shipments.csv',
  ]);
});
it('clears operational caches when the cookie session cannot be restored', async () => {
  axios.defaults.adapter = async (config) => {
    throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, {
      data: {},
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config,
    });
  };
  const { http, setAccessToken } = await import('./http');
  const { queryClient } = await import('../lib/query-client');
  queryClient.setQueryData(['session'], { id: 'expired' });
  queryClient.setQueryData(['inventory', 'private'], { items: ['private'] });
  setAccessToken(null);
  await expect(http.get('/inventory')).rejects.toMatchObject({ status: 401 });
  expect(queryClient.getQueryData(['session'])).toBeNull();
  expect(queryClient.getQueryData(['inventory', 'private'])).toBeUndefined();
  queryClient.clear();
});
