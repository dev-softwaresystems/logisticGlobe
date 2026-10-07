import { spawnSync } from 'node:child_process';
import { readFile, mkdir, writeFile, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
if (!process.env.npm_execpath)
  throw Error('Run through pnpm licenses:inventory');
const run = (args) => {
  const child = spawnSync(
    process.execPath,
    [process.env.npm_execpath, ...args],
    { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, shell: false },
  );
  if (child.status !== 0) throw Error('pnpm license enumeration failed');
  return JSON.parse(child.stdout);
};
const all = run(['licenses', 'list', '--json']),
  prod = run(['licenses', 'list', '--prod', '--json']);
const production = new Set(
  Object.values(prod)
    .flat()
    .flatMap((p) => p.versions.map((v) => p.name + '@' + v)),
);
const components = [],
  notices = [],
  issues = [];
for (const [license, rows] of Object.entries(all))
  for (const row of rows)
    for (const version of row.versions) {
      const id = row.name + '@' + version,
        kind = production.has(id) ? 'production' : 'development';
      const uncertain =
        !license ||
        /UNKNOWN|UNLICENSED|GPL|AGPL|MPL|LGPL|SEE LICENSE/i.test(license);
      if (uncertain)
        issues.push({
          component: id,
          license,
          scope: kind,
          decision: 'human review required',
        });
      components.push({
        type: 'library',
        name: row.name,
        version,
        'bom-ref': id,
        purl: 'pkg:npm/' + row.name.replace('@', '%40') + '@' + version,
        licenses: [{ license: { name: license || 'UNKNOWN' } }],
        properties: [{ name: 'logistics:scope', value: kind }],
      });
      const location = row.paths?.[0];
      if (location) {
        const files = await readdir(location);
        for (const file of files
          .filter((name) =>
            /^licen[cs]e(?:[.-]|$)|^copying(?:[.-]|$)|^notice(?:[.-]|$)/i.test(
              name,
            ),
          )
          .slice(0, 5)) {
          try {
            const content = await readFile(join(location, file), 'utf8');
            if (content.length <= 100000)
              notices.push('=== ' + id + ' / ' + file + ' ===\n' + content);
          } catch {
            /* directory or unavailable: inventory flags evidence separately */
          }
        }
      }
    }
components.sort((a, b) => a['bom-ref'].localeCompare(b['bom-ref']));
const output = resolve('artifacts/closure/licenses');
await mkdir(output, { recursive: true });
const lock = await readFile('pnpm-lock.yaml'),
  timestamp = new Date().toISOString();
const sbom = {
  bomFormat: 'CycloneDX',
  specVersion: '1.6',
  serialNumber: 'urn:uuid:' + randomUUID(),
  version: 1,
  metadata: {
    timestamp,
    component: {
      type: 'application',
      name: 'LogisticsGlobe',
      version: '0.1.0',
    },
    properties: [
      {
        name: 'logistics:lock-sha256',
        value: createHash('sha256').update(lock).digest('hex'),
      },
      {
        name: 'logistics:scope',
        value:
          'npm installed dependency inventory; not OS container SBOM or legal clearance',
      },
    ],
  },
  components,
};
await writeFile(join(output, 'sbom.cdx.json'), JSON.stringify(sbom, null, 2));
await writeFile(
  join(output, 'review.json'),
  JSON.stringify(
    {
      generatedAt: timestamp,
      components: components.length,
      production: production.size,
      issues,
      containerReview: 'separate image/OS scan required',
      fonts:
        'OS font families, PDF standard metrics; no custom binary font bundled',
      maps: 'Leaflet software license inventoried; provider tiles/dataset attribution and terms pending',
    },
    null,
    2,
  ),
);
await writeFile(join(output, 'THIRD-PARTY-NOTICES.txt'), notices.join('\n\n'));
console.log(
  JSON.stringify({
    components: components.length,
    production: production.size,
    reviewRequired: issues.length,
    output: 'artifacts/closure/licenses',
  }),
);
