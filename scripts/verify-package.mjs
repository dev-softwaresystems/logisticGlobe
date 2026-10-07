import { readFile, mkdir, writeFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
if (!process.env.npm_execpath) throw Error('Run through pnpm release:verify');
const archive = resolve('artifacts/closure/LogisticsGlobe-source.tar.gz'),
  hash = (await readFile(archive + '.sha256', 'utf8')).split(' ')[0];
if (
  createHash('sha256')
    .update(await readFile(archive))
    .digest('hex') !== hash
)
  throw Error('Archive checksum mismatch');
const target = resolve(
  'artifacts/closure',
  'clean-' + randomBytes(5).toString('hex'),
);
await mkdir(target);
const listing = spawnSync('tar', ['-tzf', archive], { encoding: 'utf8' });
const paths = listing.stdout.split(/\r?\n/).filter(Boolean);
if (
  listing.status !== 0 ||
  paths.length > 2500 ||
  paths.some(
    (p) =>
      p.startsWith('/') ||
      p.startsWith('\\\\') ||
      /^[A-Za-z]:/.test(p) ||
      p.split(/[\\\\/]/).includes('..') ||
      (/(^|\/)\.env(?:\.|$)/.test(p) && !p.endsWith('.env.example')),
  )
)
  throw Error('Unsafe archive content');
const tar = spawnSync('tar', ['-xzf', archive, '-C', target], {
  encoding: 'utf8',
});
if (tar.status !== 0) throw Error('Extraction failed');
const manifest = JSON.parse(
  await readFile(join(target, 'delivery-manifest.json'), 'utf8'),
);
for (const file of manifest.entries) {
  if (file.path.includes('..') || file.path.startsWith('/'))
    throw Error('Unsafe manifest');
  if (
    createHash('sha256')
      .update(await readFile(join(target, file.path)))
      .digest('hex') !== file.sha256
  )
    throw Error('Source checksum mismatch');
}
function run(args) {
  const r = spawnSync(process.execPath, [process.env.npm_execpath, ...args], {
    cwd: target,
    env: {
      ...process.env,
      DATABASE_URL: 'postgresql://localhost/package_validation',
    },
    stdio: 'inherit',
    shell: false,
  });
  if (r.status !== 0) throw Error('Clean package command failed: ' + args[0]);
}
run(['install', '--frozen-lockfile', '--offline']);
run(['db:generate']);
run(['typecheck']);
run(['build']);
const assets = join(target, 'apps/web/dist/assets');
const generatedCss = (await readdir(assets)).find((name) =>
  /^index-.*\.css$/.test(name),
);
if (!generatedCss) throw Error('Missing generated application CSS');
const cssHash = createHash('sha256')
  .update(await readFile(join(assets, generatedCss)))
  .digest('hex');
let cssMatchesWorkspace = null;
try {
  const rootAssets = resolve('apps/web/dist/assets');
  const rootCss = (await readdir(rootAssets)).find((name) =>
    /^index-.*\.css$/.test(name),
  );
  if (rootCss)
    cssMatchesWorkspace =
      createHash('sha256')
        .update(await readFile(join(rootAssets, rootCss)))
        .digest('hex') === cssHash;
} catch {
  /* A standalone recipient need not have a prior build. */
}
if (cssMatchesWorkspace === false)
  throw Error('Application CSS differs between workspace and clean package');
await writeFile(
  resolve('artifacts/closure/package-verification.json'),
  JSON.stringify(
    {
      verifiedAt: new Date().toISOString(),
      archiveSha256: hash,
      sourceContentSha256: manifest.sourceContentSha256,
      files: manifest.entries.length,
      frozenInstall: true,
      generate: true,
      typecheck: true,
      build: true,
      target,
      excludedPrivateFiles: true,
      applicationCssSha256: cssHash,
      cssMatchesWorkspace,
    },
    null,
    2,
  ),
);
console.log(
  'Clean package verified with frozen install, generation, types and build.',
);
