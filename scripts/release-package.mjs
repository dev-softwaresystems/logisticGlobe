import {
  readdir,
  readFile,
  writeFile,
  mkdir,
  lstat,
  copyFile,
} from 'node:fs/promises';
import { join, resolve, relative, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const root = process.cwd(),
  stage = resolve('artifacts/closure/delivery-stage'),
  output = resolve('artifacts/closure');
await mkdir(stage, { recursive: true });
const bases = [
  'README.md',
  'AGENTS.md',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'docker-compose.yml',
  'docker-compose.application.yml',
  '.env.example',
  '.gitignore',
  '.dockerignore',
  '.editorconfig',
  '.prettierrc',
  '.prettierignore',
  'apps',
  'packages',
  'services',
  'infra',
  'docs',
  '.github',
  'scripts',
];
const skip = new Set([
  'node_modules',
  'dist',
  'generated',
  'artifacts',
  'coverage',
  '.git',
  '.agents',
  '.codex',
  '.aws',
  'build',
]);
const extensions = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.cjs',
  '.json',
  '.yaml',
  '.yml',
  '.md',
  '.css',
  '.html',
  '.svg',
  '.png',
  '.ico',
  '.sql',
  '.prisma',
  '.toml',
  '.conf',
  '.txt',
  '.sh',
  '.ps1',
]);
const entries = [];
async function walk(path) {
  let info;
  try {
    info = await lstat(path);
  } catch {
    return;
  }
  if (info.isSymbolicLink()) throw Error('Symlinks excluded from delivery');
  if (info.isDirectory()) {
    for (const name of (await readdir(path)).sort())
      if (!skip.has(name)) await walk(join(path, name));
    return;
  }
  const name = relative(root, path).split('\\').join('/');
  if (/(^|\/)\.env(?:\.|$)/.test(name) && !name.endsWith('.env.example'))
    return;
  if (
    !extensions.has(extname(name)) &&
    !bases.includes(name) &&
    !/Dockerfile$|\.Dockerfile$/.test(name)
  )
    return;
  const data = await readFile(path);
  if (data.length > 5 * 1024 * 1024)
    throw Error('Oversized delivery source: ' + name);
  const text = data.toString('utf8');
  if (
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|AKIA[A-Z0-9]{16}|gh[pousr]_[A-Za-z0-9]{30,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/.test(
      text,
    )
  )
    throw Error('Potential credential excluded: ' + name);
  const target = join(stage, name);
  await mkdir(resolve(target, '..'), { recursive: true });
  await copyFile(path, target);
  entries.push({
    path: name,
    bytes: data.length,
    sha256: createHash('sha256').update(data).digest('hex'),
  });
}
for (const base of bases) await walk(resolve(base));
for (const file of [
  'sbom.cdx.json',
  'review.json',
  'THIRD-PARTY-NOTICES.txt',
]) {
  const source = resolve('artifacts/closure/licenses', file),
    target = join(stage, 'delivery', file);
  const data = await readFile(source);
  await mkdir(resolve(target, '..'), { recursive: true });
  await copyFile(source, target);
  entries.push({
    path: 'delivery/' + file,
    bytes: data.length,
    sha256: createHash('sha256').update(data).digest('hex'),
  });
}
// Only synthetic, explicitly reviewed QA evidence may enter the package.
for (const [sourceName, deliveryName] of [
  ['api-image-sbom.cdx.json', 'api-image-sbom.cdx.json'],
  ['web-image-sbom.cdx.json', 'web-image-sbom.cdx.json'],
  ['sustained-load.json', 'sustained-load.json'],
  ['recovery-drill.json', 'recovery-drill.json'],
  ['executive-large.pdf', 'executive-large.pdf'],
  ['system-desktop.png', 'system-desktop.png'],
  ['system-mobile.png', 'system-mobile.png'],
  ['routes-desktop.png', 'routes-desktop.png'],
  ['routes-mobile.png', 'routes-mobile.png'],
  ['../next-dashboard-desktop.png', 'dashboard-desktop.png'],
  ['../next-dashboard-mobile.png', 'dashboard-mobile.png'],
]) {
  let data;
  try {
    data = await readFile(resolve(output, sourceName));
  } catch {
    continue;
  } // CI has no local load/recovery approval or device data.
  const name = 'delivery/evidence/' + deliveryName,
    target = join(stage, name);
  await mkdir(resolve(target, '..'), { recursive: true });
  await writeFile(target, data);
  entries.push({
    path: name,
    bytes: data.length,
    sha256: createHash('sha256').update(data).digest('hex'),
  });
}
entries.sort((a, b) => a.path.localeCompare(b.path));
const revision = spawnSync('git', ['rev-parse', 'HEAD'], {
  encoding: 'utf8',
}).stdout.trim();
const manifest = {
  product: 'LogisticsGlobe',
  createdAt: new Date().toISOString(),
  revision,
  dirty: true,
  sourceContentSha256: createHash('sha256')
    .update(JSON.stringify(entries))
    .digest('hex'),
  entries,
  excluded: [
    'real .env/credentials',
    '.git',
    'dependencies/builds/generated',
    'backups/artifacts',
    'corporate originals/PII',
  ],
  externalDelivery: 'not authorized; encryption/recipient/channel pending',
};
await writeFile(
  join(stage, 'delivery-manifest.json'),
  JSON.stringify(manifest, null, 2),
);
const names = [...entries.map((e) => e.path), 'delivery-manifest.json'].sort();
await writeFile(join(output, 'delivery-files.txt'), names.join('\n') + '\n');
const archive = join(output, 'LogisticsGlobe-source.tar.gz');
const tar = spawnSync(
  'tar',
  ['-czf', archive, '-C', stage, '-T', join(output, 'delivery-files.txt')],
  { encoding: 'utf8', shell: false },
);
if (tar.status !== 0) throw Error('Source package creation failed');
const buffer = await readFile(archive);
await writeFile(
  archive + '.sha256',
  createHash('sha256').update(buffer).digest('hex') +
    '  LogisticsGlobe-source.tar.gz\n',
);
console.log(
  JSON.stringify({
    archive: 'artifacts/closure/LogisticsGlobe-source.tar.gz',
    files: entries.length,
    bytes: buffer.length,
    sourceContentSha256: manifest.sourceContentSha256,
    encryption:
      'pending recipient/channel approval; plaintext QA package remains ignored',
  }),
);
