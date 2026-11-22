import { test, expect } from '@playwright/test';

test('Piloto V2: evaluación local y registro remoto voluntario', async ({ page }) => {
  const peticiones = [];
  await page.route('**/api/user-queries', async route => {
    peticiones.push(route.request().postDataJSON());
    await route.fulfill({ status: 201, contentType: 'application/json',
      body: JSON.stringify({ id: 77, faqMatch: 'sin_match_exacto', aportesLibres: 0 }) });
  });
  await page.goto('/#/lab/orientador', { waitUntil: 'domcontentloaded' });
  await page.locator('#orientador-texto').fill('¿Qué es la naturaleza?');
  await page.getByRole('button', { name: 'Comenzar orientación' }).click();
  await page.locator('[data-opcion="distinguir"]').click();
  await page.locator('#orientador-otra').click();
  await page.locator('#orientador-busqueda').fill('Técnica');
  await page.locator('#orientador-libre button[type=submit]').click();
  await page.locator('[data-opcion="principiante"]').click();
  await page.locator('[data-opcion="breve"]').click();
  await page.locator('[data-opcion="sin_preferencia"]').click();
  await page.locator('#orientador-conforme').click();
  await expect(page.locator('#orientador-trazabilidad')).toContainText('definir');
  await expect(page.locator('#orientador-trazabilidad')).toContainText('distinguir');
  await expect(page.locator('#orientador-evaluacion-panel')).toBeVisible();
  expect(peticiones).toHaveLength(0);
  await page.locator('#orientador-piloto-claridad').selectOption('si');
  await page.locator('#orientador-piloto-fidelidad').selectOption('en_parte');
  await page.locator('#orientador-piloto-influencia').selectOption('cambio_direccion');
  await page.locator('#orientador-piloto-comentario').fill('El diálogo me llevó a precisar la comparación.');
  await page.locator('#orientador-evaluacion button[type=submit]').click();
  await expect(page.locator('#orientador-evaluacion-guardada')).toBeVisible();
  await expect(page.locator('#orientador-json')).toContainText('"influencia": "cambio_direccion"');
  expect(peticiones).toHaveLength(0);
  await page.locator('#orientador-registrar').click();
  await expect(page.locator('#orientador-registro')).toContainText('Consulta registrada');
  expect(peticiones).toHaveLength(1);
  expect(peticiones[0].evaluacionPiloto.influencia).toBe('cambio_direccion');
  expect(peticiones[0].bitacora.at(-1).tipo).toBe('cierre');
});
