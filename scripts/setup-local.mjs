import { readFile, writeFile, access } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
const portArgument = process.argv.find((argument) =>
  argument.startsWith('--postgres-port='),
);
const postgresPort = portArgument ? Number(portArgument.split('=')[1]) : 5432;
if (!Number.isInteger(postgresPort) || postgresPort < 1 || postgresPort > 65535)
  throw new Error('Invalid PostgreSQL port');
async function createOnly(target, content) {
  try {
    await writeFile(target, content, { flag: 'wx' });
    console.log('Created ' + target);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    console.log('Preserved existing ' + target);
  }
}
let infrastructure = await readFile('.env.example', 'utf8');
infrastructure = infrastructure.replace(
  'POSTGRES_PORT=5432',
  'POSTGRES_PORT=' + postgresPort,
);
await createOnly('.env', infrastructure);
const rootEnvironment = await readFile('.env', 'utf8');
const rootPort =
  /^POSTGRES_PORT=(\d+)$/m.exec(rootEnvironment)?.[1] ?? String(postgresPort);
const rootUser =
  /^POSTGRES_USER=(.+)$/m.exec(rootEnvironment)?.[1]?.trim() ?? 'postgres';
const rootPassword =
  /^POSTGRES_PASSWORD=(.+)$/m.exec(rootEnvironment)?.[1]?.trim() ?? 'postgres';
const rootDatabase =
  /^POSTGRES_DB=(.+)$/m.exec(rootEnvironment)?.[1]?.trim() ?? 'logistics';
let api = await readFile('apps/api/.env.example', 'utf8');
api = api
  .replace(
    /^DATABASE_URL=.+$/m,
    'DATABASE_URL=postgresql://' +
      encodeURIComponent(rootUser) +
      ':' +
      encodeURIComponent(rootPassword) +
      '@localhost:' +
      rootPort +
      '/' +
      encodeURIComponent(rootDatabase),
  )
  .replace(
    'JWT_ACCESS_SECRET=replace_me',
    'JWT_ACCESS_SECRET=' + randomBytes(48).toString('hex'),
  )
  .replace(
    'JWT_REFRESH_SECRET=replace_me',
    'JWT_REFRESH_SECRET=' + randomBytes(48).toString('hex'),
  )
  .replace(
    'SEED_ADMIN_PASSWORD=',
    'SEED_ADMIN_PASSWORD=' + randomBytes(24).toString('base64url'),
  );
let existingApi = '';
try {
  existingApi = await readFile('apps/api/.env', 'utf8');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const hasConfiguredSecrets =
  /^JWT_ACCESS_SECRET=(.{32,})$/m.test(existingApi) &&
  /^JWT_REFRESH_SECRET=(.{32,})$/m.test(existingApi);
if (existingApi && hasConfiguredSecrets) {
  console.log(
    'Preserved configured apps/api/.env; review infrastructure port and database settings if needed',
  );
} else {
  await createOnly('apps/api/.env.local', api);
  console.log(
    'Development API settings: apps/api/.env.local; existing apps/api/.env remains unchanged',
  );
}
await createOnly(
  'apps/web/.env.local',
  await readFile('apps/web/.env.example', 'utf8'),
);
console.log(
  'Next: pnpm infra:up, pnpm db:migrate, pnpm db:seed, pnpm dev. Development credentials are in your ignored API environment file.',
);
