import { checksum } from './backup-integrity.mjs';
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { resolve, relative } from 'node:path';
import { randomBytes } from 'node:crypto';
const input = process.argv.slice(2).find((value) => value !== '--');
if (!input)
  throw new Error('Pass the backup directory under artifacts/backups');
const directory = resolve(input);
if (relative(resolve('artifacts', 'backups'), directory).startsWith('..'))
  throw new Error('Restore verification accepts only local artifacts/backups');
const manifest = JSON.parse(
  await readFile(resolve(directory, 'manifest.json'), 'utf8'),
);
for (const value of [manifest.postgresDatabase, manifest.mongoDatabase])
  if (typeof value !== 'string' || !/^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/.test(value))
    throw new Error('Invalid backup manifest');
if (
  manifest.checksums?.postgres !==
    (await checksum(resolve(directory, 'postgres.dump'))) ||
  manifest.checksums?.mongo !==
    (await checksum(resolve(directory, 'mongo.archive.gz')))
)
  throw new Error('Backup integrity check failed');
const target =
  'lg_' + Date.now() + '_' + randomBytes(4).toString('hex') + '_restore_test';
if (target === manifest.postgresDatabase || target === manifest.mongoDatabase)
  throw new Error('Source and target must differ');
let rootEnv = '';
try {
  rootEnv = await readFile('.env', 'utf8');
} catch {}
const user =
  process.env.POSTGRES_USER ??
  /^POSTGRES_USER=(.+)$/m.exec(rootEnv)?.[1]?.trim() ??
  'postgres';
if (!/^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/.test(user))
  throw new Error('Invalid database user');
async function command(args, file) {
  const child = spawn('docker', ['compose', 'exec', '-T', ...args], {
    stdio: [file ? 'pipe' : 'ignore', 'pipe', 'pipe'],
    shell: false,
  });
  let output = '';
  child.stdout.on('data', (chunk) => {
    if (output.length < 10000) output += String(chunk);
  });
  child.stderr.resume();
  const done = new Promise((yes, no) => {
    child.once('error', () => no(new Error('Docker is unavailable')));
    child.once('close', (code) =>
      code === 0
        ? yes(output)
        : no(
            new Error(
              'Restore verification command failed for its isolated target',
            ),
          ),
    );
  });
  if (file)
    await Promise.all([
      pipeline(createReadStream(resolve(directory, file)), child.stdin),
      done,
    ]);
  return done;
}
await command([
  'postgres',
  'psql',
  '-U',
  user,
  '-d',
  'postgres',
  '-v',
  'ON_ERROR_STOP=1',
  '-c',
  'CREATE DATABASE "' + target + '"',
]);
await command(
  [
    'postgres',
    'pg_restore',
    '-U',
    user,
    '-d',
    target,
    '--no-owner',
    '--exit-on-error',
  ],
  'postgres.dump',
);
await command(
  [
    'mongodb',
    'mongorestore',
    '--archive',
    '--gzip',
    '--nsFrom=' + manifest.mongoDatabase + '.*',
    '--nsTo=' + target + '.*',
  ],
  'mongo.archive.gz',
);
const counts = await command([
  'postgres',
  'psql',
  '-U',
  user,
  '-d',
  target,
  '-t',
  '-A',
  '-v',
  'ON_ERROR_STOP=1',
  '-c',
  'SELECT json_build_object(\'roles\',(SELECT count(*) FROM "Role"),\'users\',(SELECT count(*) FROM "User"),\'shipments\',(SELECT count(*) FROM "Shipment"),\'items\',(SELECT count(*) FROM "InventoryItem"))',
]);
const telemetry = await command([
  'mongodb',
  'mongosh',
  '--quiet',
  '--eval',
  'JSON.stringify({telemetry:db.getSiblingDB(' +
    JSON.stringify(target) +
    ').getCollection("vehicle_telemetry").countDocuments({})})',
]);
const result = {
  verifiedAt: new Date().toISOString(),
  targetDatabase: target,
  postgres: JSON.parse(counts.trim()),
  mongo: JSON.parse(telemetry.trim()),
  sourcesPreserved: true,
};
await writeFile(
  resolve(directory, 'restore-verification.json'),
  JSON.stringify(result, null, 2) + '\n',
  { flag: 'wx', mode: 0o600 },
);
console.log(JSON.stringify(result, null, 2));
console.log(
  'The isolated restore databases are retained for inspection; source databases were not modified.',
);
