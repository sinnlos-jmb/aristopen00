import { readFileSync } from 'node:fs';
import { resumirPiloto } from '../shared/orientador-piloto.js';

const archivos = process.argv.slice(2);
if (!archivos.length) {
  console.error('Uso: node scripts/resumir-orientador-piloto.mjs sesion1.json sesion2.json ...');
  process.exitCode = 1;
} else {
  const sesiones = [];
  for (const archivo of archivos) {
    const valor = JSON.parse(readFileSync(archivo, 'utf8'));
    if (Array.isArray(valor)) sesiones.push(...valor);
    else sesiones.push(valor);
  }
  console.log(JSON.stringify(resumirPiloto(sesiones), null, 2));
}
