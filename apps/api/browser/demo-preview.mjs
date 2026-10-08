import { config } from 'dotenv';
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
config({ path: '.env.local', quiet: true });
const origin = process.env.DEMO_PREVIEW_ORIGIN ?? 'http://localhost:18080';
if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname))
  throw new Error('Only loopback previews may be reviewed');
const email =
  process.env.DEMO_EMAIL ||
  process.env.SEED_ADMIN_EMAIL ||
  'admin@logisticsglobe.local';
const password = process.env.DEMO_PASSWORD || process.env.SEED_ADMIN_PASSWORD;
if (!password)
  throw new Error('Existing private development credentials required');
const output = resolve('../../artifacts/demo');
await mkdir(output, { recursive: true });
const privateNames = [
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'SEED_ADMIN_PASSWORD',
  'GPS_INGEST_TOKEN',
  'METRICS_TOKEN',
  'DEMO_PASSWORD',
];
const protectedValues = privateNames
  .filter((name) => process.env[name]?.length >= 12)
  .map((name) => process.env[name]);
async function checkFiles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await checkFiles(path);
    else if (/\.(js|css|html|ts|tsx|mjs|md|json)$/.test(entry.name)) {
      const text = await readFile(path, 'utf8');
      if (protectedValues.some((value) => text.includes(value)))
        throw new Error(
          'Private environment value found in checked source/bundle',
        );
    }
  }
}
for (const directory of [
  '../web/src',
  '../web/dist',
  '../../packages/shared/src',
  './browser',
  './demo',
  './src/fleet',
])
  await checkFiles(resolve(directory));
async function checkNativeLogs() {
  let nativeLogsChecked = false;
  for (const name of ['native-api.log', 'native-api-error.log']) {
    try {
      const log = await readFile(join(output, name), 'utf8');
      if (protectedValues.some((value) => log.includes(value)))
        throw new Error(
          'Private environment value found in native preview log',
        );
      nativeLogsChecked = true;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  return nativeLogsChecked;
}
const browser = await chromium.launch();
const evidence = [];
try {
  for (const viewport of [
    { width: 1280, height: 900 },
    { width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on('pageerror', (error) => {
      let message = error.message;
      for (const value of protectedValues)
        message = message.replaceAll(value, '[redacted]');
      message = message.replace(
        /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
        '[redacted-token]',
      );
      errors.push({ name: error.name, message, page: page.url() });
    });
    await page.goto(origin + '/login');
    await page.getByLabel('Correo electrónico', { exact: true }).fill(email);
    await page.getByLabel('Contraseña', { exact: true }).fill(password);
    await page
      .getByRole('button', { name: 'Entrar al centro de operaciones' })
      .click();
    await expect(
      page.getByRole('heading', {
        name: 'Resumen de operaciones',
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText(/Incluye datos de DEMOSTRACIÓN LGD-V1-/),
    ).toBeVisible();
    const routes = [
      '/dashboard',
      '/fleet',
      '/shipments',
      '/inventory',
      '/alerts',
      '/reports',
      '/system',
      '/routing',
      '/users',
    ];
    for (const route of routes) {
      await page.goto(origin + route);
      await expect(page.locator('h1')).toBeVisible();
      await expect(
        page.getByText(/Centro de operaciones.*En vivo/),
      ).toBeVisible();
      await expect(page.locator('.query-state[role="status"]')).toHaveCount(0);
      await expect(page.locator('.error-state')).toHaveCount(0);
      if (route === '/dashboard' || route === '/fleet') {
        const controlLabel = page.locator('.map-controls label');
        const box = await controlLabel.boundingBox();
        if (!box || box.height > 100)
          throw new Error('Map selector stretched vertically');
      }
      if (route === '/fleet') {
        await page
          .getByLabel('Buscar matrícula', { exact: true })
          .fill('LGD-V1-');
        await expect(
          page
            .getByRole('combobox', { name: 'Vehículo en el mapa', exact: true })
            .locator('option'),
        ).toHaveCount(21);
        await page
          .getByRole('combobox', { name: 'Vehículo en el mapa', exact: true })
          .selectOption({ label: 'LGD-V1-MX-001' });
        await page
          .getByRole('button', { name: 'Centrar vehículo', exact: true })
          .click();
        await expect(
          page.getByRole('region', {
            name: 'Detalle del vehículo seleccionado',
          }),
        ).toContainText('12,000 kg');
        await expect(
          page
            .getByRole('region', {
              name: 'Mapa geográfico de posiciones recibidas',
            })
            .locator('.leaflet-overlay-pane path'),
        ).toHaveCount(18);
        await page
          .getByRole('combobox', { name: 'Estado de flota', exact: true })
          .selectOption('MAINTENANCE');
        await expect(
          page
            .getByRole('combobox', { name: 'Vehículo en el mapa', exact: true })
            .locator('option'),
        ).toHaveCount(4);
        await page
          .getByRole('combobox', { name: 'Estado de flota', exact: true })
          .selectOption('');
        await page
          .getByRole('combobox', { name: 'Vehículo en el mapa', exact: true })
          .selectOption({ label: 'LGD-V1-MX-020 · Sin telemetría' });
        await expect(
          page.getByRole('button', { name: 'Centrar vehículo', exact: true }),
        ).toBeDisabled();
        await expect(
          page.getByRole('region', {
            name: 'Detalle del vehículo seleccionado',
          }),
        ).toContainText('Sin telemetría');
      }
      if (route === '/fleet')
        await page
          .getByRole('button', { name: 'Mostrar flota visible', exact: true })
          .click();
      if (
        !(await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ))
      )
        throw new Error('Horizontal overflow on ' + route);
      await page.screenshot({
        path: join(output, route.slice(1) + '-' + viewport.width + '.png'),
        fullPage: true,
      });
    }
    if (errors.length) {
      console.log(JSON.stringify({ browserErrors: errors }));
      throw new Error('Browser errors while reviewing demo pages');
    }
    await page
      .getByRole('button', { name: 'Cerrar sesión', exact: true })
      .click();
    await page.waitForURL(/\/login$/);
    await page.close();
    evidence.push({
      viewport,
      routes,
      positionedVehicles: 18,
      selectedVehicle: true,
      noTelemetry: true,
      statusFilter: true,
      browserErrors: 0,
      horizontalOverflow: false,
      externalTilesVerified: false,
    });
  }
  const nativeLogsChecked = await checkNativeLogs();
  await writeFile(
    join(output, 'preview-verification.json'),
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        origin,
        sourceAndBundleSecretsChecked: true,
        nativeLogsChecked,
        evidence,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      preview: origin,
      checkedViewports: evidence.length,
      pagesPerViewport: 9,
      sourceAndBundleSecretsChecked: true,
      nativeLogsChecked,
      externalTilesVerified: false,
    }),
  );
} finally {
  for (const context of browser.contexts()) {
    for (const page of context.pages()) {
      const logout = page.getByRole('button', {
        name: 'Cerrar sesión',
        exact: true,
      });
      if (!page.isClosed() && (await logout.count()) === 1) {
        await logout.click({ timeout: 5000 }).catch(() => {});
        await page.waitForURL(/\/login$/, { timeout: 5000 }).catch(() => {});
      }
    }
  }
  await browser.close();
}
