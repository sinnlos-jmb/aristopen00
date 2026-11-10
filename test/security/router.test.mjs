import test from 'node:test';
import assert from 'node:assert/strict';
import { createRouter } from '../../public/js/router.js';

test('el router muestra mensajes de excepción como texto, nunca como HTML', async () => {
  const prev = { window: globalThis.window, location: globalThis.location, document: globalThis.document };
  let mounted;
  const container = {
    replaceChildren(node) { mounted = node; },
    set innerHTML(_value) { assert.fail('No se debe usar innerHTML para errores del router'); },
  };
  globalThis.window = { addEventListener() {} };
  globalThis.location = { hash: '#/fallo' };
  globalThis.document = {
    getElementById: id => id === 'app' ? container : null,
    createElement: tag => ({ tagName: tag.toUpperCase(), className: '', textContent: '' }),
  };
  const originalError = console.error;
  console.error = () => {};
  try {
    const router = createRouter({
      routes: { '/fallo': () => { throw new Error('<img src=x onerror=alert(1)>'); } },
      notFound: () => ({ el: {} }),
    });
    await router.start();
    assert.equal(mounted.tagName, 'DIV');
    assert.equal(mounted.className, 'empty');
    assert.match(mounted.textContent, /<img src=x onerror=alert\(1\)>/);
  } finally {
    console.error = originalError;
    for (const [key, value] of Object.entries(prev)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});
