import { checksum } from './backup-integrity.mjs';
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
const readEnv = async () => {
  try {
    return await readFile('.env', 'utf8');
  } catch {
    return '';
  }
};
const source = await readEnv();
const setting = (key, fallback) =>
  process.env[key] ??
  new RegExp('^' + key + '=(.+)$', 'm').exec(source)?.[1]?.trim() ??
  fallback;
const user = setting('POSTGRES_USER', 'postgres');
const pgDb = setting('BACKUP_POSTGRES_DB', setting('POSTGRES_DB', 'logistics'));
const mongoDb = setting('BACKUP_MONGO_DB', setting('POSTGRES_DB', 'logistics'));
for (const value of [user, pgDb, mongoDb])
  if (!/^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/.test(value))
    throw new Error('Invalid local backup identifier');
const directory = resolve(
  'artifacts',
  'backups',
  new Date().toISOString().replace(/[:.]/g, '-') +
    '-' +
    randomBytes(4).toString('hex'),
);
await mkdir(directory, { recursive: true });
async function dump(args, file) {
  const child = spawn('docker', ['compose', 'exec', '-T', ...args], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
  });
  let detail = '';
  child.stderr.on('data', (chunk) => {
    if (detail.length < 1000) detail += String(chunk);
  });
  const completed = new Promise((yes, no) => {
    child.once('error', () => no(new Error('Docker is unavailable')));
    child.once('close', (code) =>
      code === 0
        ? yes()
        : no(
            new Error(
              'Backup command failed; check local Compose service availability',
            ),
          ),
    );
  });
  await Promise.all([
    pipeline(
      child.stdout,
      createWriteStream(resolve(directory, file), { flags: 'wx', mode: 0o600 }),
    ),
    completed,
  ]);
}
await dump(
  ['postgres', 'pg_dump', '-U', user, '-d', pgDb, '--format=custom'],
  'postgres.dump',
);
await dump(
  ['mongodb', 'mongodump', '--archive', '--gzip', '--db', mongoDb],
  'mongo.archive.gz',
);
await writeFile(
  resolve(directory, 'manifest.json'),
  JSON.stringify(
    {
      version: 1,
      createdAt: new Date().toISOString(),
      postgresDatabase: pgDb,
      mongoDatabase: mongoDb,
      checksums: {
        postgres: await checksum(resolve(directory, 'postgres.dump')),
        mongo: await checksum(resolve(directory, 'mongo.archive.gz')),
      },
    },
    null,
    2,
  ) + '\n',
  { flag: 'wx', mode: 0o600 },
);
console.log(
  JSON.stringify(
    {
      backupDirectory: directory,
      sources: ['postgresql', 'mongodb'],
      redis: 'Derived cache; rebuilt from MongoDB',
    },
    null,
    2,
  ),
);
