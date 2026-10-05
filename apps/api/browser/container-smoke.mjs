import { config } from 'dotenv';
import { chromium } from '@playwright/test';
import { resolve } from 'node:path';
config({ path: resolve('.env.local'), quiet: true });
const base = process.env.CONTAINER_SMOKE_ORIGIN ?? 'http://localhost:18080';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname))
  throw new Error('This smoke command is restricted to loopback');
if (!process.env.SEED_ADMIN_PASSWORD)
  throw new Error('An existing development seed account is required');
const browser = await chromium.launch();
try {
  for (const viewport of [
    { width: 1280, height: 900 },
    { width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport });
    const problems = [];
    page.on('pageerror', (error) => problems.push(error.name));
    await page.goto(base + '/login');
    await page
      .getByLabel('Correo electrónico', { exact: true })
      .fill(process.env.SEED_ADMIN_EMAIL ?? 'admin@logisticsglobe.local');
    await page
      .getByLabel('Contraseña', { exact: true })
      .fill(process.env.SEED_ADMIN_PASSWORD);
    await page
      .getByRole('button', { name: 'Entrar al centro de operaciones' })
      .click();
    await page
      .getByRole('heading', { name: 'Resumen de operaciones', exact: true })
      .waitFor();
    await page
      .getByRole('heading', { name: 'Envíos activos', exact: true })
      .waitFor();
    const ready = await page.request.get(base + '/api/v1/health/ready');
    if (!ready.ok()) throw new Error('Container readiness failed');
    await page.reload();
    await page
      .getByRole('heading', { name: 'Resumen de operaciones', exact: true })
      .waitFor();
    if (problems.length) throw new Error('Browser runtime error');
    if (
      !(await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ))
    )
      throw new Error('Horizontal overflow');
    await page
      .getByRole('button', { name: 'Cerrar sesión', exact: true })
      .click();
    await page.waitForURL(/\/login$/);
    await page.close();
    console.log(
      JSON.stringify({
        container: true,
        viewport,
        login: true,
        refresh: true,
        dashboard: true,
        readiness: true,
        logout: true,
        browserErrors: 0,
      }),
    );
  }
} finally {
  await browser.close();
}
