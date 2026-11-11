import { test, expect } from '@playwright/test';

test('Orientador V1 aclara una inquietud y conserva la bitácora al cerrarla', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#/lab/orientador', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#lab-orientador')).toBeVisible();
  await page.locator('#orientador-texto').fill('Quiero comprender la naturaleza');
  await page.getByRole('button', { name: 'Comenzar orientación' }).click();
  await expect(page.locator('#lab-orientador')).toContainText('¿Qué te gustaría hacer con ese tema?');
  await page.locator('[data-opcion="relacionar"]').click();
  await page.locator('[data-opcion="eudaimonia"]').click();
  await page.locator('[data-opcion="principiante"]').click();
  await page.locator('[data-opcion="extensa"]').click();
  await page.locator('[data-opcion="phusis"]').click();
  await expect(page.locator('#lab-orientador')).toContainText('La consulta está especificada');
  await page.locator('#orientador-conforme').click();
  await expect(page.locator('#lab-orientador')).toContainText('conforme');
  await expect(page.locator('#orientador-bitacora li')).toHaveCount(7);
  await expect(page.locator('#orientador-json')).toContainText('\"estado\": \"conforme\"');
  expect(errors).toEqual([]);
});

test('Orientador V1 permite abandonar sin inventar preferencias', async ({ page }) => {
  await page.goto('/#/lab/orientador', { waitUntil: 'domcontentloaded' });
  await page.locator('#orientador-texto').fill('Algo que no figura en el léxico');
  await page.getByRole('button', { name: 'Comenzar orientación' }).click();
  await expect(page.locator('#lab-orientador')).toContainText('¿Qué tema querés explorar?');
  await page.locator('#orientador-abandonar').click();
  await expect(page.locator('#lab-orientador')).toContainText('abandonado');
  await expect(page.locator('#lab-orientador')).toContainText('No precisado');
});
