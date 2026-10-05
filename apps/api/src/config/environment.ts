export interface RuntimeEnvironment {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  WEB_ORIGIN: string;
  DATABASE_URL: string;
  MONGODB_URI: string;
  REDIS_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  GPS_INGEST_TOKEN: string;
  GPS_ALLOWED_VEHICLE_IDS: string[];
  ROUTING_URL: string;
  METRICS_TOKEN: string;
  DISTRIBUTED_REALTIME: boolean;
  DISTRIBUTED_RATE_LIMIT: boolean;
  TRUST_PROXY_HOPS: number;
}
export function durationSeconds(value: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(value);
  if (!match) throw new Error('Invalid token lifetime');
  const factors: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return Number(match[1]) * factors[match[2]];
}
export function validateEnvironment(
  input: Record<string, unknown>,
): RuntimeEnvironment {
  const errors: string[] = [];
  const text = (key: string, fallback?: string): string => {
    const value = input[key] ?? fallback;
    if (typeof value !== 'string' || !value.trim()) {
      errors.push(key);
      return '';
    }
    return value;
  };
  const NODE_ENV = text('NODE_ENV', 'development');
  if (!['development', 'test', 'production'].includes(NODE_ENV))
    errors.push('NODE_ENV');
  const PORT = Number(input.PORT ?? 3000);
  if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) errors.push('PORT');
  const WEB_ORIGIN = text('WEB_ORIGIN', 'http://localhost:5173');
  const DATABASE_URL = text('DATABASE_URL');
  const MONGODB_URI = text(
    'MONGODB_URI',
    'mongodb://localhost:27017/logistics',
  );
  const REDIS_URL = text('REDIS_URL', 'redis://localhost:6379');
  for (const [key, value, protocols] of [
    ['WEB_ORIGIN', WEB_ORIGIN, ['http:', 'https:']],
    ['DATABASE_URL', DATABASE_URL, ['postgres:', 'postgresql:']],
    ['MONGODB_URI', MONGODB_URI, ['mongodb:', 'mongodb+srv:']],
    ['REDIS_URL', REDIS_URL, ['redis:', 'rediss:']],
  ] as const) {
    try {
      if (!protocols.some((protocol) => protocol === new URL(value).protocol))
        errors.push(key);
    } catch {
      errors.push(key);
    }
  }
  try {
    if (new URL(WEB_ORIGIN).origin !== WEB_ORIGIN) errors.push('WEB_ORIGIN');
  } catch {
    /* already reported */
  }
  const JWT_ACCESS_SECRET = text('JWT_ACCESS_SECRET');
  const JWT_REFRESH_SECRET = text('JWT_REFRESH_SECRET');
  if (JWT_ACCESS_SECRET.length < 32) errors.push('JWT_ACCESS_SECRET');
  if (
    JWT_REFRESH_SECRET.length < 32 ||
    JWT_REFRESH_SECRET === JWT_ACCESS_SECRET
  )
    errors.push('JWT_REFRESH_SECRET');
  const JWT_ACCESS_EXPIRES_IN = text('JWT_ACCESS_EXPIRES_IN', '15m');
  const JWT_REFRESH_EXPIRES_IN = text('JWT_REFRESH_EXPIRES_IN', '7d');
  for (const [key, value, max] of [
    ['JWT_ACCESS_EXPIRES_IN', JWT_ACCESS_EXPIRES_IN, 900],
    ['JWT_REFRESH_EXPIRES_IN', JWT_REFRESH_EXPIRES_IN, 604800],
  ] as const) {
    try {
      const seconds = durationSeconds(value);
      if (seconds <= 0 || seconds > max) errors.push(key);
    } catch {
      errors.push(key);
    }
  }
  const optional = (key: string): string => {
    const value = input[key] ?? '';
    if (typeof value !== 'string') {
      errors.push(key);
      return '';
    }
    return value.trim();
  };
  const GPS_INGEST_TOKEN = optional('GPS_INGEST_TOKEN');
  const METRICS_TOKEN = optional('METRICS_TOKEN');
  for (const [key, value] of [
    ['GPS_INGEST_TOKEN', GPS_INGEST_TOKEN],
    ['METRICS_TOKEN', METRICS_TOKEN],
  ] as const)
    if (
      value &&
      (value.length < 32 ||
        [JWT_ACCESS_SECRET, JWT_REFRESH_SECRET].includes(value))
    )
      errors.push(key);
  if (GPS_INGEST_TOKEN && GPS_INGEST_TOKEN === METRICS_TOKEN)
    errors.push('METRICS_TOKEN');
  const GPS_ALLOWED_VEHICLE_IDS = optional('GPS_ALLOWED_VEHICLE_IDS')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (
    GPS_ALLOWED_VEHICLE_IDS.some(
      (value) =>
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          value,
        ),
    ) ||
    (GPS_INGEST_TOKEN && !GPS_ALLOWED_VEHICLE_IDS.length)
  )
    errors.push('GPS_ALLOWED_VEHICLE_IDS');
  const ROUTING_URL = optional('ROUTING_URL');
  if (ROUTING_URL) {
    try {
      const url = new URL(ROUTING_URL);
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        url.pathname !== '/'
      )
        errors.push('ROUTING_URL');
    } catch {
      errors.push('ROUTING_URL');
    }
  }
  const flag = (key: string): boolean => {
    const value = input[key] ?? 'false';
    if (!['true', 'false', true, false].includes(value as string | boolean))
      errors.push(key);
    return value === true || value === 'true';
  };
  const DISTRIBUTED_REALTIME = flag('DISTRIBUTED_REALTIME');
  const DISTRIBUTED_RATE_LIMIT = flag('DISTRIBUTED_RATE_LIMIT');
  const TRUST_PROXY_HOPS = Number(input.TRUST_PROXY_HOPS ?? 0);
  if (
    !Number.isInteger(TRUST_PROXY_HOPS) ||
    TRUST_PROXY_HOPS < 0 ||
    TRUST_PROXY_HOPS > 2
  )
    errors.push('TRUST_PROXY_HOPS');
  if (errors.length)
    throw new Error(
      'Invalid or missing environment variables: ' +
        [...new Set(errors)].join(', '),
    );
  return {
    NODE_ENV: NODE_ENV as RuntimeEnvironment['NODE_ENV'],
    PORT,
    WEB_ORIGIN,
    DATABASE_URL,
    MONGODB_URI,
    REDIS_URL,
    JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET,
    JWT_ACCESS_EXPIRES_IN,
    JWT_REFRESH_EXPIRES_IN,
    GPS_INGEST_TOKEN,
    GPS_ALLOWED_VEHICLE_IDS,
    ROUTING_URL,
    METRICS_TOKEN,
    DISTRIBUTED_REALTIME,
    DISTRIBUTED_RATE_LIMIT,
    TRUST_PROXY_HOPS,
  };
}
