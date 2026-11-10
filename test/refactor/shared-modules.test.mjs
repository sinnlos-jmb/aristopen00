import test from 'node:test';
import assert from 'node:assert/strict';
import { esc as escShared } from '../../public/shared/escape-html.js';
import { esc as escMain } from '../../public/js/ui.js';
import { esc as escLabo } from '../../public/labo/js/ui.js';
import { esc as escTagueo } from '../../public/tagueo/js/ui.js';
import { loadPublicModule } from '../../src/utils/public-module.js';

test('las tres interfaces usan el mismo escape HTML', () => {
  const input = `<p title="O'Reilly">Ágora & λόγος</p>`;
  const expected = '&lt;p title=&quot;O&#39;Reilly&quot;&gt;Ágora &amp; λόγος&lt;/p&gt;';
  for (const escape of [escShared, escMain, escLabo, escTagueo]) {
    assert.equal(escape(input), expected);
    assert.equal(escape(null), '');
    assert.equal(escape(0), '0');
  }
});

test('el backend carga los mismos módulos públicos de dominio', async () => {
  const viaAdapter = await loadPublicModule('js/content/trayecto.js');
  const viaImport = await import('../../public/js/content/trayecto.js');
  assert.equal(viaAdapter, viaImport);
  assert.equal(typeof viaAdapter.normalizeTrayecto, 'function');
  const motor = await loadPublicModule('tagueo/js/store.js');
  assert.equal(typeof motor.build, 'function');
});

test('el adaptador rechaza rutas que salgan de public', () => {
  for (const name of ['../server.js', '/etc/passwd', '.', './js/store.js', 'js/../store.js', 'C:\\private.js', '..\\server.js', '']) {
    assert.throws(() => loadPublicModule(name), TypeError);
  }
});
