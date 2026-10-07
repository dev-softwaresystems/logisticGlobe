import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { randomBytes, createHash } from 'node:crypto';
const directory = resolve('artifacts/closure/encryption-demo');
await mkdir(directory, { recursive: true });
const home = resolve(directory, 'gnupg');
await mkdir(home, { recursive: true });
const gpg = process.env.GPG_BINARY ?? 'gpg',
  password = randomBytes(32).toString('hex');
const source = resolve(directory, 'demo.txt'),
  encrypted = resolve(directory, 'demo.txt.gpg'),
  restored = resolve(directory, 'recovered.txt');
await writeFile(
  source,
  'LogisticsGlobe DEMO ONLY — no source, secrets or customer data.\n',
);
const nativePath = (value) =>
  relative(process.cwd(), value).split('\\').join('/');
async function run(args) {
  const child = spawn(
    gpg,
    [
      '--homedir',
      nativePath(home),
      '--no-tty',
      '--batch',
      '--yes',
      '--pinentry-mode',
      'loopback',
      '--passphrase-fd',
      '0',
      '--no-symkey-cache',
      ...args,
    ],
    { stdio: ['pipe', 'ignore', 'pipe'], shell: false },
  );
  let detail = '';
  child.stderr.on('data', (chunk) => {
    detail += String(chunk).slice(0, 1000);
  });
  const done = new Promise((yes, no) => {
    child.on('error', () => no(Error('GPG unavailable')));
    child.on('close', (code) =>
      code === 0
        ? yes()
        : no(Error('GPG demo failed: ' + detail.slice(0, 1000))),
    );
  });
  child.stdin.end(password + '\n');
  await done;
}
await run([
  '--symmetric',
  '--cipher-algo',
  'AES256',
  '--output',
  nativePath(encrypted),
  nativePath(source),
]);
await run([
  '--decrypt',
  '--output',
  nativePath(restored),
  nativePath(encrypted),
]);
const a = await readFile(source),
  b = await readFile(restored);
if (!a.equals(b)) throw Error('Decryption mismatch');
await writeFile(
  resolve(directory, 'verification.json'),
  JSON.stringify(
    {
      testedAt: new Date().toISOString(),
      tool: 'GnuPG standard AES256 symmetric demo',
      demoOnly: true,
      roundTripVerified: true,
      sha256: createHash('sha256').update(a).digest('hex'),
      keyStored: false,
      realDelivery:
        'pending approved recipient public key and separate channel',
    },
    null,
    2,
  ),
);
console.log(
  'Demo encrypted/decrypted and checksum verified. Random key stayed in memory; no real delivery.',
);
