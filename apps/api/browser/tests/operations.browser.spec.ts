import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
async function login(page: Page, email = process.env.BROWSER_TEST_EMAIL!) {
  await page.goto('http://localhost:5174/login');
  await page.getByLabel('Correo electrónico', { exact: true }).fill(email);
  await page
    .getByLabel('Contraseña', { exact: true })
    .fill(process.env.BROWSER_TEST_PASSWORD!);
  await page
    .getByRole('button', { name: 'Entrar al centro de operaciones' })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Resumen de operaciones', exact: true }),
  ).toBeVisible();
}
test('shipment lifecycle, GPS, critical stock, real CSV download and responsive dashboard', async ({
  page,
}, info) => {
  const prefix = process.env.BROWSER_PREFIX! + '-' + info.project.name;
  await login(page);
  await page.getByRole('link', { name: 'Flota', exact: true }).click();
  await page.getByLabel('Nueva matrícula', { exact: true }).fill(prefix);
  await page
    .getByRole('button', { name: 'Registrar vehículo', exact: true })
    .click();
  await expect(page.getByRole('row').filter({ hasText: prefix })).toBeVisible();
  await page.getByRole('link', { name: 'Envíos', exact: true }).click();
  await page
    .getByRole('button', { name: 'Registrar envío', exact: true })
    .click();
  await page.getByLabel('Referencia única').fill(prefix);
  await page.getByLabel('Origen', { exact: true }).fill('Origen de prueba');
  await page.getByLabel('Destino', { exact: true }).fill('Destino de prueba');
  await page
    .locator('form.operation-form select[name="priority"]')
    .selectOption('HIGH');
  await expect(
    page.getByRole('option', { name: prefix.toUpperCase(), exact: true }),
  ).toBeAttached();
  await page
    .locator('select[name="vehicleId"]')
    .selectOption({ label: prefix.toUpperCase() });
  await page
    .getByRole('button', { name: 'Guardar envío', exact: true })
    .click();
  await page.getByRole('link', { name: prefix, exact: true }).click();
  await page
    .getByRole('button', { name: 'Iniciar tránsito', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Confirmar entrega', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Confirmar entrega', exact: true })
    .click();
  await expect(page.locator('.timeline li')).toHaveCount(3);
  await expect(
    page.getByRole('button', { name: 'Confirmar entrega', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('link', { name: 'Flota', exact: true }).click();
  await page
    .getByRole('row')
    .filter({ hasText: prefix })
    .getByRole('button', { name: 'Seguimiento', exact: true })
    .click();
  await page.getByLabel('Latitud', { exact: true }).fill('19.4326');
  await page.getByLabel('Longitud', { exact: true }).fill('-99.1332');
  await page
    .getByRole('button', { name: 'Registrar observación', exact: true })
    .click();
  await expect(
    page.getByText('Observación registrada.', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', {
      name: 'Mapa geográfico de posiciones recibidas',
    }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Inventario', exact: true }).click();
  await page
    .getByRole('button', { name: 'Nuevo almacén', exact: true })
    .click();
  await page.getByLabel('Código', { exact: true }).fill(prefix);
  await page.getByLabel('Nombre', { exact: true }).fill('Almacén ' + prefix);
  await page.getByLabel('Capacidad en unidades').fill('100');
  await page
    .getByRole('button', { name: 'Guardar almacén', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Registrar almacén', exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Registrar artículo', exact: true })
    .click();
  await page
    .locator('select[name="warehouseId"]')
    .selectOption({ label: 'Almacén ' + prefix });
  await page.getByLabel('SKU', { exact: true }).fill(prefix);
  await page.getByLabel('Nombre', { exact: true }).fill('Artículo ' + prefix);
  await page.getByLabel('Existencia en unidades').fill('3');
  await page.getByLabel('Mínimo de seguridad').fill('10');
  await page
    .getByRole('button', { name: 'Guardar existencias', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Registrar artículo', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('link', { name: 'Alertas', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: prefix })).toContainText(
    'Abierta',
  );
  await page.getByRole('link', { name: 'Inventario', exact: true }).click();
  await page
    .getByRole('row')
    .filter({ hasText: prefix })
    .getByRole('button', { name: 'Ajustar', exact: true })
    .click();
  await page.getByLabel('Existencia en unidades').fill('12');
  await page
    .getByLabel('Motivo del ajuste')
    .fill('Reposición durante verificación automatizada');
  await page
    .getByRole('button', { name: 'Guardar existencias', exact: true })
    .click();
  await expect(
    page.getByRole('heading', {
      name: 'Ajustar Artículo ' + prefix,
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByRole('link', { name: 'Alertas', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Estado', exact: true })
    .selectOption('resolved');
  await expect(page.getByRole('row').filter({ hasText: prefix })).toContainText(
    'Resuelta',
  );
  await page.getByRole('link', { name: 'Reportes', exact: true }).click();
  const download = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Exportar envíos', exact: true })
    .click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('shipments.csv');
  const target = info.outputPath('shipments.csv');
  await file.saveAs(target);
  const csv = await readFile(target, 'utf8');
  expect(csv).toContain(prefix);
  expect(csv).toContain('DELIVERED');
  await page.getByRole('link', { name: 'Resumen', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Envíos activos', exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: resolve(
      '../../artifacts/next-dashboard-' + info.project.name + '.png',
    ),
    fullPage: true,
  });
  await page
    .getByRole('button', { name: 'Cerrar sesión', exact: true })
    .click();
  await expect(page).toHaveURL(/\/login$/);
});
test('administrator creates and deactivates users while VIEWER cannot access administration', async ({
  page,
  browser,
}, info) => {
  const prefix = process.env.BROWSER_PREFIX! + '-' + info.project.name;
  const email = prefix.toLowerCase() + '@browser.test';
  await login(page);
  await page.getByRole('link', { name: 'Usuarios', exact: true }).click();
  await page
    .getByRole('button', { name: 'Crear usuario', exact: true })
    .click();
  await page.getByLabel('Nombre', { exact: true }).fill('Usuario ' + prefix);
  await page.getByLabel('Correo electrónico', { exact: true }).fill(email);
  await page
    .getByLabel('Contraseña inicial', { exact: true })
    .fill(process.env.BROWSER_TEST_PASSWORD!);
  await page
    .getByRole('button', { name: 'Guardar usuario', exact: true })
    .click();
  await expect(page.getByRole('row').filter({ hasText: email })).toContainText(
    'VIEWER',
  );
  const viewer = await browser.newPage();
  try {
    await login(viewer, email);
    await expect(
      viewer.getByRole('link', { name: 'Usuarios', exact: true }),
    ).toHaveCount(0);
    await viewer.goto('http://localhost:5174/users');
    await expect(
      viewer.getByRole('heading', { name: 'Acceso restringido', exact: true }),
    ).toBeVisible();
  } finally {
    await viewer.close();
  }
  await page
    .getByRole('row')
    .filter({ hasText: email })
    .getByRole('button', { name: 'Editar', exact: true })
    .click();
  await page.getByLabel('Cuenta activa', { exact: true }).uncheck();
  await page
    .getByRole('button', { name: 'Guardar usuario', exact: true })
    .click();
  await expect(page.getByRole('row').filter({ hasText: email })).toContainText(
    'Inactiva',
  );
  await page
    .getByRole('row')
    .filter({ hasText: email })
    .getByRole('button', { name: 'Ver cambios', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Cambios de permisos', exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: resolve('../../artifacts/next-users-' + info.project.name + '.png'),
    fullPage: true,
  });
  await page
    .getByRole('button', { name: 'Cerrar sesión', exact: true })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Correo electrónico', { exact: true }).fill(email);
  await page
    .getByLabel('Contraseña', { exact: true })
    .fill(process.env.BROWSER_TEST_PASSWORD!);
  await page
    .getByRole('button', { name: 'Entrar al centro de operaciones' })
    .click();
  await expect(page.getByRole('alert')).toContainText('credenciales');
});
test('calculates a provider route and renders its geometry', async ({
  page,
}) => {
  await login(page);
  await page.getByRole('link', { name: 'Rutas', exact: true }).click();
  await page.getByLabel('Latitud de origen').fill('19.4');
  await page.getByLabel('Longitud de origen').fill('-99.1');
  await page.getByLabel('Latitud de destino').fill('19.5');
  await page.getByLabel('Longitud de destino').fill('-99.2');
  await page
    .getByRole('button', { name: 'Calcular ruta', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Trayecto calculado', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Ruta calculada', exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/12.3 km/)).toBeVisible();
  await page
    .getByRole('button', { name: 'Cerrar sesión', exact: true })
    .click();
  await expect(page).toHaveURL(/\/login$/);
});
