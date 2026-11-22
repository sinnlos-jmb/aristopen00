#!/usr/bin/env node
// Solo lectura. Obtiene el mismo bundle que usa la SPA desde /api/contenido.
import fs from 'node:fs/promises';
import { auditarIdentidadYTagueo } from '../js/lab/identityTaggingAudit.js';

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) {
  console.log(`Uso:
  node public/scripts/auditar-identidad-tagueo.mjs [--url http://localhost:3000/api/contenido] [--out informe.json] [--strict]
  node public/scripts/auditar-identidad-tagueo.mjs --file bundle-contenido.json [--out informe.json]

--strict: termina con código 1 solo si hay errores estructurales, no por revisiones editoriales.
El informe nunca escribe en MariaDB.`);
  process.exit(0);
}
function value(flag, fallback = null) {
  const i = argv.indexOf(flag);
  return i === -1 ? fallback : argv[i + 1];
}
if (['--file','--url','--out'].some(flag => argv.includes(flag) && !value(flag))) {
  console.error('Falta el valor de --file, --url o --out.');process.exit(2);
}
try {
  let source;
  if (value('--file')) source = JSON.parse(await fs.readFile(value('--file'), 'utf8'));
  else {
    const url = value('--url', 'http://localhost:3000/api/contenido');
    const response = await fetch(url, { headers: {Accept: 'application/json'}, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`GET ${url}: HTTP ${response.status}`);
    source = await response.json();
  }
  const result = auditarIdentidadYTagueo(source);
  const r = result.resumen;
  console.log(`Auditoría de identidad y tagueo v${result.version} · ${result.versionCorpus}`);
  console.log(`Estático ${r.conceptosEstaticos} | funcional ${r.nodosFuncionales} | compartidos ${r.identidadesCompartidas} | remisiones ${r.remisionesExplicitas}`);
  console.log(`Párrafos ${r.parrafosEtiquetados} | unidades ${r.unidades} | subunidades ${r.subunidades} | relaciones de subunidad ${r.relacionesSubunidad}`);
  console.log(`Estados: ${JSON.stringify(r.estadosParrafo)} | niveles: ${JSON.stringify(r.nivelesTag)}`);
  console.log(`Errores estructurales: ${r.errores} | revisiones editoriales: ${r.revisiones}`);
  for (const h of result.hallazgos.slice(0, 40)) console.log(`- [${h.nivel}] ${h.codigo} @ ${h.ubicacion}: ${h.detalle}`);
  if (result.hallazgos.length > 40) console.log(`... ${result.hallazgos.length - 40} hallazgos más; usar --out para ver todos.`);
  if (value('--out')) {
    await fs.writeFile(value('--out'), JSON.stringify(result,null,2) + '\n', 'utf8');
    console.log(`Informe JSON: ${value('--out')}`);
  }
  if (argv.includes('--strict') && r.errores) process.exitCode = 1;
} catch (err) {
  console.error(`No se completó la auditoría: ${err.message}`);
  process.exitCode = 2;
}
