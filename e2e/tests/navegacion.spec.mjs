import { test, expect } from '@playwright/test';

const links = [
  ['/', '.landing-view'],
  ['/chat', '.view-chat'],
  ['/reading', '.reading-catalog'],
  ['/grafos', '.card-grid--catalog'],
  ['/lab', '.card-grid--catalog'],
];

test('navega entre las cinco secciones sin fallos JavaScript', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#status')).toContainText('E2E fixture');
  for (const [path, selector] of links) {
    await page.evaluate(path => { location.hash = `#${path}`; }, path);
    await expect(page.locator(`#app ${selector}`).first()).toBeVisible();
    await expect(page.locator('#app')).not.toContainText('Error cargando la vista');
  }
  expect(errors).toEqual([]);
});

test('FAQ se abre, permite elegir pregunta y se cierra', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await page.goto('/#/chat', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#faq-btn')).toBeVisible();
  await page.locator('#faq-btn').click();
  await expect(page.locator('#faq-modal')).toHaveAttribute('open', '');
  await expect(page.locator('#faq-body [data-faq="faq-demo"]')).toBeVisible();
  await page.locator('#faq-body [data-faq="faq-demo"]').click();
  await expect(page.locator('#faq-modal')).not.toHaveAttribute('open', '');
  await expect(page.locator('#input')).toHaveValue('¿Qué es el bien?');
  await page.locator('#faq-btn').click();
  await page.locator('#faq-close').click();
  await expect(page.locator('#faq-modal')).not.toHaveAttribute('open', '');
  expect(errors).toEqual([]);
});

test('Chat se desmonta y vuelve a montarse sin modales huérfanos', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await page.goto('/#/chat', { waitUntil: 'domcontentloaded' });
  await page.locator('#faq-btn').click();
  await page.evaluate(() => { location.hash = '#/reading'; });
  await expect(page.locator('#app .reading-catalog')).toBeVisible();
  await expect(page.locator('#faq-modal')).toHaveCount(0);
  await page.evaluate(() => { location.hash = '#/chat'; });
  await expect(page.locator('#faq-btn')).toBeVisible();
  await page.locator('#faq-btn').click();
  await expect(page.locator('#faq-modal')).toHaveAttribute('open', '');
  expect(errors).toEqual([]);
});

test('lectura carga un capítulo bilingüe de la fixture', async ({ page }) => {
  await page.goto('/#/reading', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.reader-book')).toHaveCount(1);
  await page.locator('.reader-chapter > summary').first().click();
  await expect(page.locator('.reader-chapter-content').first()).toContainText('Toda acción humana');
});
