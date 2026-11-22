// Uso: node public/scripts/exportar-grafo-cypher.mjs [URL_API] [RUTA_SALIDA]
// Sólo lee /api/contenido; nunca toca la base editorial.
import { writeFile } from 'node:fs/promises';
import { buildStore } from '../js/store.js';
import { buildSemanticProjection, exportarRelateCypher } from '../js/lab/semanticProjection.js';
const api = process.argv[2] || 'http://localhost:3000/api/contenido';
const output = process.argv[3] || 'agora-relate-import.cypher';
try {
  const response = await fetch(api, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`API devolvió HTTP ${response.status}`);
  const data = await response.json();
  if (!data?.tags?.unidades || !data?.tags?.faqs || !data?.funcional || !data?.estatico)
    throw new Error('La respuesta no cumple el contrato de /api/contenido');
  const S = buildStore(data.tags, {
    funcional: data.funcional, estatico: data.estatico,
    manual: data.manual, argumentos: data.argumentos, trayectos: data.trayectos,
  });
  const graph = buildSemanticProjection(S);
  await writeFile(output, exportarRelateCypher(graph), 'utf8');
  console.log(`Archivo: ${output}`);
  console.log(`Nodos: ${graph.stats.nodos} | vínculos: ${graph.stats.aristas} | incidencias: ${graph.stats.incidencias}`);
  if (graph.issues.length) console.log('Revisá las incidencias en el Explorador; no se inventaron extremos.');
} catch (error) {
  console.error('No se pudo exportar el grafo:', error.message);
  process.exitCode = 1;
}
