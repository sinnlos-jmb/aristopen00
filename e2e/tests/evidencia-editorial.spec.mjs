import { test, expect } from '@playwright/test';
import { contenido } from '../fixtures.mjs';

test('muestra tags como contexto editorial sin adjudicarlos a una subunidad ni inventar un plan', async ({ page }) => {
  await page.route('**/api/contenido', async route => {
    const fixture = structuredClone(contenido);
    fixture.tags.unidades = [{
      id: 'metodo', titulo: 'Método', parrafos: [6],
      subunidades: [{ id: '1094b14-19', titulo: 'Lo noble y lo justo varían',
        conceptos_clave: ['kalon', 'phusis'], movimientos: ['contraste'], voz_texto: ['A'] }],
    }];
    fixture.tags.parrafos = [{ parrafo: 6, conceptos: [
      { c: 'phusis', s: 'por_naturaleza', n: 'presente' },
      { c: 'phusis', s: 'del_asunto', n: 'presente' },
    ] }];
    await route.fulfill({ json: fixture });
  });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#/lab/motor', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-question-case="naturaleza"]').click();
  const panel = page.locator('#lab-evidence-audit');
  await expect(panel).toContainText('Candidatos documentales');
  await expect(panel).toContainText('el bot NO seleccionó este trayecto');
  await panel.locator('summary').click();
  await expect(panel).toContainText('1094b14-19');
  await expect(panel).toContainText('sentido: por_naturaleza');
  await expect(panel).toContainText('sentido: del_asunto');
  await expect(panel).toContainText('pertenecen a párrafos, no específicamente a esta subunidad');
  await expect(page.locator('#lab-json')).toContainText('"evidenceAudit"');
  expect(errors).toEqual([]);
});
