// Ágora N1-U.16: registra la vista de consultas sin reescribir ni sustituir el resto del Lab.
// Uso desde la raíz del repositorio: node instalar-lab-n1u16.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const checkOnly = process.argv.includes('--check');
const file = path.resolve('public/js/views/lab.js');
if (!fs.existsSync(file)) {
  console.error(`No existe ${file}. Ejecutá el script desde la raíz de Ágora.`);
  process.exit(1);
}
const original = fs.readFileSync(file, 'utf8');
const eol = original.includes('\r\n') ? '\r\n' : '\n';
let result = original;
const importStmt = "import { createLabConsultaView } from './labConsultaView.js';";
const catalogMarker = /export\s+const\s+EXPERIMENTS\s*=\s*Object\.freeze\s*\(\s*\{/g;
const viewMarker = /export\s+function\s+createLabView\s*\(\s*App\s*,\s*opts\s*=\s*\{\s*\}\s*\)\s*\{/g;
const viewLine = "if (opts.exp === 'consultas') return createLabConsultaView(App);";
const catalogKey = /\bconsultas\s*:/g;

function countMatches(text, re) { return Array.from(text.matchAll(re)).length; }
function fail(msg) { console.error(`N1-U.16: ${msg} No se modificó lab.js.`); process.exit(1); }
const sections = [
  ['EXPERIMENTS',catalogMarker],
  ['createLabView',viewMarker],
];
for(const [label,matcher] of sections) {
  if(countMatches(result, matcher)!==1) fail(`No puedo localizar de manera inequívoca ${label}.`);
}
if(countMatches(result,catalogKey)>1)fail('La tarjeta consultas ya aparece más de una vez.');
if(countMatches(result,/import\s*\{\s*createLabConsultaView\s*\}\s*from\s*['"]\.\/labConsultaView\.js['"];?/g)>1)fail('La importación está duplicada.');
if(countMatches(result,/if\s*\(\s*opts\.exp\s*===\s*['"]consultas['"]\s*\)/g)>1)fail('El enrutado de consultas está duplicado.');
const hasCatalog = countMatches(result,catalogKey)===1;
const hasImport = result.includes(importStmt);
const hasRoute = result.includes(viewLine);
if (!hasImport) {
  // Anteponer import no altera las importaciones y comentarios existentes.
  const bom=result.startsWith('\ufeff')?'\ufeff':'';
  result=bom+importStmt+eol+result.slice(bom.length);
}
if (!hasCatalog) {
  const card = [
    "", "  consultas: {", "    id: 'consultas', tab: 1, title: 'Consultas y recuperación',",
    "    desc: 'Explorá citas y fichas con preguntas, filtros visuales y patrones de grafos estilo Cypher.',",
    "    tag: 'N1-U.16 · Exploratorio', icon: '🔎', featured: false", "  },"
  ].join(eol);
  result=result.replace(catalogMarker, full => full + card);
}
if (!hasRoute) {
  result=result.replace(viewMarker, full=>full+eol+"  // N1-U.16: nueva vista del Lab, sin modificar los experimentos existentes."+eol+"  "+viewLine);
}
if(!result.includes(importStmt)||!result.includes("consultas: {")||!result.includes(viewLine))fail('La integración no produjo las tres piezas esperadas.');
const additions=[!hasImport?'importación':null,!hasCatalog?'tarjeta':null,!hasRoute?'ruta':null].filter(Boolean);
if(result===original){console.log('N1-U.16: la tarjeta, la ruta y la importación ya están instaladas.');process.exit(0);}
const testFile=path.join(path.dirname(file),`.n1u16-verify-${process.pid}.mjs`);
try {
  fs.writeFileSync(testFile,result,'utf8');
  const test=spawnSync(process.execPath,['--check',testFile],{encoding:'utf8'});
  if(test.status!==0) fail(`El resultado no supera node --check: ${test.stderr||test.stdout}`);
} finally {if(fs.existsSync(testFile))fs.unlinkSync(testFile);}
if(checkOnly){console.log('N1-U.16: inserción compatible; se agregarían '+additions.join(', ')+'. Archivo sin cambios.');process.exit(0);}
const backup=file+'.antes-n1u16.bak';
if (fs.existsSync(backup))fail(`Ya existe respaldo ${backup}; no lo sobrescribo.`);
fs.writeFileSync(backup,original,'utf8');
fs.writeFileSync(file,result,'utf8');
console.log('N1-U.16 instalado en lab.js ('+additions.join(', ')+').');
console.log('Copia de seguridad: '+backup);
