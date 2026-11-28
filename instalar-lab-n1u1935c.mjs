// Ágora N1-U.19.3.5c: registra la vista de nucleos sin reescribir ni sustituir el resto del Lab.
// Uso desde la raíz del repositorio: node instalar-lab-n1u1935c.mjs [--check]
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
const importStmt = "import { createLabNucleiView } from './labNucleiView.js';";
const catalogMarker = /export\s+const\s+EXPERIMENTS\s*=\s*Object\.freeze\s*\(\s*\{/g;
const viewMarker = /export\s+function\s+createLabView\s*\(\s*App\s*,\s*opts\s*=\s*\{\s*\}\s*\)\s*\{/g;
const viewLine = "if (opts.exp === 'nucleos') return createLabNucleiView(App);";
const catalogKey = /\bnucleos\s*:/g;

function countMatches(text, re) { return Array.from(text.matchAll(re)).length; }
function fail(msg) { console.error(`N1-U.19.3.5c: ${msg} No se modificó lab.js.`); process.exit(1); }
const sections = [
  ['EXPERIMENTS',catalogMarker],
  ['createLabView',viewMarker],
];
for(const [label,matcher] of sections) {
  if(countMatches(result, matcher)!==1) fail(`No puedo localizar de manera inequívoca ${label}.`);
}
if(countMatches(result,catalogKey)>1)fail('La tarjeta nucleos ya aparece más de una vez.');
if(countMatches(result,/import\s*\{\s*createLabNucleiView\s*\}\s*from\s*['"]\.\/labNucleiView\.js['"];?/g)>1)fail('La importación está duplicada.');
if(countMatches(result,/if\s*\(\s*opts\.exp\s*===\s*['"]nucleos['"]\s*\)/g)>1)fail('El enrutado de nucleos está duplicado.');
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
    "", "  nucleos: {", "    id: 'nucleos', tab: 1, title: 'Articulaciones semánticas',",
    "    desc: 'Explorá hilos de preguntas, núcleos semánticos y evidencia del Libro I.',",
    "    tag: 'N1-U.19.3.5c · Exploratorio', icon: '🧵', featured: false", "  },"
  ].join(eol);
  result=result.replace(catalogMarker, full => full + card);
}
if (!hasRoute) {
  result=result.replace(viewMarker, full=>full+eol+"  // N1-U.19.3.5c: nueva vista del Lab, sin modificar los experimentos existentes."+eol+"  "+viewLine);
}
if(!result.includes(importStmt)||!result.includes("nucleos: {")||!result.includes(viewLine))fail('La integración no produjo las tres piezas esperadas.');
const additions=[!hasImport?'importación':null,!hasCatalog?'tarjeta':null,!hasRoute?'ruta':null].filter(Boolean);
if(result===original){console.log('N1-U.19.3.5c: la tarjeta, la ruta y la importación ya están instaladas.');process.exit(0);}
const testFile=path.join(path.dirname(file),`.n1u1935c-verify-${process.pid}.mjs`);
try {
  fs.writeFileSync(testFile,result,'utf8');
  const test=spawnSync(process.execPath,['--check',testFile],{encoding:'utf8'});
  if(test.status!==0) fail(`El resultado no supera node --check: ${test.stderr||test.stdout}`);
} finally {if(fs.existsSync(testFile))fs.unlinkSync(testFile);}
if(checkOnly){console.log('N1-U.19.3.5c: inserción compatible; se agregarían '+additions.join(', ')+'. Archivo sin cambios.');process.exit(0);}
const backup=file+'.antes-n1u1935c.bak';
if (fs.existsSync(backup))fail(`Ya existe respaldo ${backup}; no lo sobrescribo.`);
fs.writeFileSync(backup,original,'utf8');
fs.writeFileSync(file,result,'utf8');
console.log('N1-U.19.3.5c instalado en lab.js ('+additions.join(', ')+').');
console.log('Copia de seguridad: '+backup);
