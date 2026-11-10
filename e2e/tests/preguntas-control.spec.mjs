import { test, expect } from '@playwright/test';

test('Laboratorio documenta una divergencia léxica y deja inspeccionar la decisión del motor', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#/lab/motor', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#lab-question-bench')).toBeVisible();
  await expect(page.locator('#lab-question-bench')).toContainText('¿Qué es la phýsis?');
  await page.locator('[data-question-case="physis-acentuada"]').click();
  await expect(page.locator('#lab-input')).toHaveValue('¿Qué es la phýsis?');
  await expect(page.locator('#lab-json')).toContainText('"questionAudit"');
  await expect(page.locator('#lab-json')).toContainText('"missing"');
  await expect(page.locator('#lab-diagnosis')).toContainText('Decisión del detector');
  expect(errors).toEqual([]);
});
