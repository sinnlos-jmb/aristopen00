import { test, expect } from '@playwright/test';

test('V2: una pregunta por tres conceptos mantiene su continuidad', async ({ page }) => {
  await page.goto('/#/lab/orientador', { waitUntil: 'domcontentloaded' });
  await page.locator('#orientador-texto').fill('¿Cuáles son las diferencias entre disposición, virtud y felicidad?');
  await page.getByRole('button', { name: 'Comenzar orientación' }).click();
  await expect(page.locator('#orientador-reconocimiento')).toContainText('Parece que querés distinguirlos');
  const opciones = page.locator('#orientador-opciones [data-opcion]');
  await expect(opciones).toHaveCount(3);
  await expect(opciones.nth(0)).toHaveAttribute('data-opcion', 'hexis');
  await expect(opciones.nth(1)).toHaveAttribute('data-opcion', 'arete');
  await expect(opciones.nth(2)).toHaveAttribute('data-opcion', 'eudaimonia');
  await expect(page.locator('#orientador-otra')).toContainText('Otro concepto');
  await page.locator('[data-opcion="hexis"]').click();
  await expect(page.locator('#lab-orientador')).toContainText('Empezando por');
  await expect(page.locator('#orientador-opciones [data-opcion="distinguir"]')).toContainText(/virtud|excelencia|areté/i);
  await expect(page.locator('#orientador-opciones [data-opcion="distinguir"]')).toContainText(/felicidad/i);
  await page.locator('[data-opcion="distinguir"]').click();
  await expect(page.locator('#orientador-continuidad')).toContainText(/arete|areté|virtud|excelencia/i);
  await expect(page.locator('#orientador-continuidad')).toContainText(/felicidad/i);
  await expect(page.locator('#lab-orientador')).toContainText('¿Desde qué punto partimos?');
  await page.locator('#orientador-sentido-texto').fill('Disposición adquirida en el hábito');
  await page.getByRole('button', { name: 'Conservar precisión' }).click();
  await expect(page.locator('#orientador-json')).toContainText('precision_sentido');
});

test('V2: «Otro concepto» no solicita repetir la pregunta inicial', async ({ page }) => {
  await page.goto('/#/lab/orientador', { waitUntil: 'domcontentloaded' });
  await page.locator('#orientador-texto').fill('¿Cuáles son las diferencias entre disposición, virtud y felicidad?');
  await page.getByRole('button', { name: 'Comenzar orientación' }).click();
  await page.locator('#orientador-otra').click();
  await expect(page.locator('#orientador-libre')).toContainText('otro concepto');
  await expect(page.locator('#orientador-libre')).not.toContainText('inquietud inicial');
});

test('V2 no confunde el comparativo «mejor» con un tema autónomo', async ({ page }) => {
  await page.goto('/#/lab/orientador', { waitUntil: 'domcontentloaded' });
  await page.locator('#orientador-texto').fill('¿Cuál es la mejor de las virtudes?');
  await page.getByRole('button', { name: 'Comenzar orientación' }).click();
  await expect(page.locator('#orientador-reconocimiento')).toContainText('evaluar su importancia');
  await expect(page.locator('#orientador-diagnostico')).toContainText('evaluar');
  await expect(page.locator('[data-opcion="evaluar"]')).toBeVisible();
});
