// Código de dominio compartido con el navegador (public/js/content/…).
// El back usa exactamente las mismas reglas de validación que el front.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { config } from '../config.js';

const load = rel => import(pathToFileURL(path.join(config.publicDir, rel)).href);

export const trayectoModel = await load('js/content/trayecto.js');
export const storeModel = await load('js/store.js');
export const graphModel = await load('js/bot/graph.js');
export const detectModel = await load('js/bot/detect.js');
