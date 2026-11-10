// Índice derivado efímero, nunca otra fuente editorial. No almacena un JSON público.
import crypto from 'node:crypto';
import { loadPublicModule } from '../utils/public-module.js';
import { leerSnapshot, validarFuentes } from './snapshot.js';
import { generarCorpus } from './corpus-core.js';
import { generarConstructor } from './query-builder-core.js';
import { generarBot } from './bot-core.js';
import { generarFase } from './fase-core.js';
import { compatibilidades } from './compatibilidad.js';

export function crearServicioCorpus({leer = leerSnapshot, motor, maxAgeMs = 5000} = {}) {
  let cache = null, inflight = null, generation = 0;
  return {
    async obtener() {
      for (;;) {
      const requestedGeneration = generation;
      if (cache && Date.now() < cache.vence) return cache;
      if (!inflight || inflight.generation !== requestedGeneration) {
      const request = {generation: requestedGeneration};
      request.promise = (async () => {
        // Si falla la base o faltan fuentes, se comunica el error: no se sirve la copia anterior.
        const startGeneration = generation;
        const snapshot = await leer();
        validarFuentes(snapshot);
        const sourceHash = crypto.createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
        if (generation === startGeneration && cache?.sourceHash === sourceHash) {
          cache.vence = Date.now() + maxAgeMs;
          return cache;
        }
        const tools = motor || await loadPublicModule('tagueo/js/store.js');
        // build() puede agregar campos a los objetos de tags; no modificar el snapshot original.
        const corpus = generarCorpus(structuredClone(snapshot), tools);
        const avisos = [];
        const constructor = generarConstructor({editorial:snapshot.editorial.constructor,tags:snapshot.tags,functional:snapshot.funcional,corpus}, x=>avisos.push(x));
        const bot = generarBot(snapshot.editorial.bot,corpus);
        const fase = generarFase(snapshot.editorial.fase,corpus);
        // Tagueo necesita estas fuentes, no el corpus derivado completo. Se mantienen
        // juntas y sin mutaciones desde la misma lectura transaccional que el Labo.
        const lectura = {txt:snapshot.textRaw,tags:snapshot.tags,estatico:snapshot.estatico,
          funcional:snapshot.funcional,refs:snapshot.refsIndex,graphIndex:snapshot.graphIndex};
        const result = {corpus, constructor, bot, fase, lectura, grafos:snapshot.graphs, avisos, compatibles:compatibilidades(snapshot.editorial), sourceHash, vence: Date.now() + maxAgeMs};
        if (generation === startGeneration) cache = result;
        return result;
      })();
      inflight = request;
      }
      const request = inflight;
      try {
        const result = await request.promise;
        if (generation === request.generation) return result;
      } catch (err) {
        if (generation === request.generation) throw err;
      } finally { if (inflight === request) inflight = null; }
      // Una transacción se confirmó durante la lectura: repetir, sin entregar datos anteriores.
      }
    },
    invalidar() { generation++; if (cache) cache.vence = 0; },
  };
}
