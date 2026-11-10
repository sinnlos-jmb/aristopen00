// Configuración leída de variables de entorno (o de back/.env, si existe).
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BACK_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(BACK_DIR, '.env');
if (existsSync(envFile) && typeof process.loadEnvFile === 'function') process.loadEnvFile(envFile);

const env = process.env;
const int = (v, d) => (v == null || v === '' ? d : Number.parseInt(v, 10));

// Admite back/public/… o back/ y public/ como carpetas hermanas.
const PUBLIC_DIR = env.PUBLIC_DIR
  ? path.resolve(env.PUBLIC_DIR)
  : existsSync(path.join(BACK_DIR, 'public/js')) ? path.join(BACK_DIR, 'public') : path.resolve(BACK_DIR, '../public');

export const config = Object.freeze({
  env: env.NODE_ENV || 'development',
  port: int(env.PORT, 3000),
  backDir: BACK_DIR,
  publicDir: PUBLIC_DIR,
  // Token para las rutas que modifican contenido (Authorization: Bearer <token>).
  editorToken: env.EDITOR_TOKEN || '',
  db: Object.freeze({
    host: env.DB_HOST || '127.0.0.1',
    port: int(env.DB_PORT, 3306),
    user: env.DB_USER || 'agora',
    password: env.DB_PASSWORD || '1234',
    database: env.DB_NAME || 'aristotle',
    connectionLimit: int(env.DB_POOL, 5),
  }),
});
