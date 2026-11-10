import express from 'express';
import path from 'node:path';
import { config } from './config.js';
import { apiRouter, crearApiRouter } from './routes/index.js';
import { errorHandler } from './middleware/error-handler.js';

export function createApp({ servicioLabo } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '5mb' }));
  app.use('/api', servicioLabo ? crearApiRouter({ servicio: servicioLabo }) : apiRouter);
  app.use(express.static(config.publicDir));
  // Fallback de la SPA compatible con Express 4 y 5.
  app.use((req, res, next) => (req.method === 'GET' || req.method === 'HEAD')
    ? res.sendFile(path.join(config.publicDir, 'index.html')) : next());
  app.use(errorHandler);
  return app;
}
