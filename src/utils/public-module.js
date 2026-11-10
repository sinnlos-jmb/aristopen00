// Único adaptador entre el backend y los módulos ES públicos de dominio.
// Conserva sus rutas existentes sin duplicar conversiones path -> file://.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { config } from '../config.js';

export function loadPublicModule(relativePath) {
  if (typeof relativePath !== 'string' || !relativePath ||
      path.isAbsolute(relativePath) || path.win32.isAbsolute(relativePath) ||
      relativePath.split(/[\\/]/).some(part => part === '..' || part === '.')) {
    throw new TypeError('Se requiere una ruta relativa dentro de public.');
  }
  return import(pathToFileURL(path.join(config.publicDir, relativePath)).href);
}
