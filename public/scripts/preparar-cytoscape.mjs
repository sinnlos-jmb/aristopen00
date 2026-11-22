// Copia la distribución y la licencia del paquete npm previamente instalado.
// Se ejecuta desde la raíz del repositorio con Node.js, sin añadir una dependencia al servidor.
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const from = resolve(root, 'node_modules/cytoscape');
const pkg = JSON.parse(await readFile(resolve(from, 'package.json'), 'utf8'));
if (pkg.version !== '3.34.4') throw new Error(`Se esperaba Cytoscape 3.34.4; instalado: ${pkg.version}`);
const to = resolve(root, 'vendor');
await mkdir(to, { recursive: true });
await copyFile(resolve(from, 'dist/cytoscape.min.js'), resolve(to, 'cytoscape.min.js'));
await copyFile(resolve(from, 'LICENSE'), resolve(to, 'CYTOSCAPE-LICENSE.txt'));
console.log(`OK: Cytoscape ${pkg.version} copiado a public/vendor/ con licencia MIT.`);
