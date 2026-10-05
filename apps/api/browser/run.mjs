import { spawn } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
const connection = process.env.TEST_DATABASE_URL;
if (!connection)
  throw new Error('TEST_DATABASE_URL is required for browser tests');
const database = new URL(connection).pathname.slice(1);
if (!database.endsWith('_test'))
  throw new Error(
    'Browser tests require a dedicated database name ending in _test',
  );
if (!process.env.npm_execpath)
  throw new Error('Run this command through pnpm test:browser');
process.env.DATABASE_URL = connection;
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.WEB_ORIGIN = 'http://localhost:5174';
process.env.JWT_ACCESS_SECRET = randomBytes(48).toString('hex');
process.env.JWT_REFRESH_SECRET = randomBytes(48).toString('hex');
process.env.MONGODB_URI = 'mongodb://localhost:27017/' + database;
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.DISTRIBUTED_REALTIME = 'false';
process.env.DISTRIBUTED_RATE_LIMIT = 'false';
process.env.BROWSER_PREFIX = 'BRT-' + randomBytes(5).toString('hex');
process.env.BROWSER_TEST_EMAIL =
  process.env.BROWSER_PREFIX.toLowerCase() + '@browser.test';
process.env.BROWSER_TEST_PASSWORD = randomBytes(24).toString('hex');
process.env.BROWSER_GPS_VEHICLE_ID = randomUUID();
process.env.GPS_INGEST_TOKEN = randomBytes(32).toString('hex');
process.env.GPS_ALLOWED_VEHICLE_IDS = process.env.BROWSER_GPS_VEHICLE_ID;
process.env.METRICS_TOKEN = randomBytes(32).toString('hex');
process.env.ROUTING_URL = 'http://127.0.0.1:3012';
process.env.VITE_API_URL = 'http://localhost:3001/api/v1';
process.env.VITE_WS_URL = 'http://localhost:3001';
process.env.VITE_MAP_TILE_URL = '';
process.env.VITE_MAP_ATTRIBUTION = '';
async function run(args) {
  const child = spawn(process.execPath, [process.env.npm_execpath, ...args], {
    stdio: 'inherit',
    shell: false,
    env: process.env,
  });
  return new Promise((yes, no) => {
    child.once('error', no);
    child.once('close', (code) => yes(code ?? 1));
  });
}
const migrated = await run(['exec', 'prisma', 'migrate', 'deploy']);
if (migrated) process.exit(migrated);
const built = await run(['build']);
if (built) process.exit(built);
for (const project of ['desktop', 'mobile']) {
  process.env.BROWSER_PROJECT = project;
  const code = await run([
    'exec',
    'playwright',
    'test',
    '--config',
    'browser/playwright.config.ts',
    '--project=' + project,
  ]);
  if (code) {
    process.exitCode = code;
    break;
  }
}
