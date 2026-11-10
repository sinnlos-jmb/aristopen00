// Código de dominio compartido con el navegador (public/js/content/…).
// El back usa exactamente las mismas reglas de validación que el front.
import { loadPublicModule } from './public-module.js';

export const trayectoModel = await loadPublicModule('js/content/trayecto.js');
export const storeModel = await loadPublicModule('js/store.js');
export const graphModel = await loadPublicModule('js/bot/graph.js');
export const detectModel = await loadPublicModule('js/bot/detect.js');
