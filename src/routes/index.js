import { Router } from 'express';
import { asyncHandler as h } from '../utils/async-handler.js';
import { health } from '../controllers/health.controller.js';
import { getContenido } from '../controllers/contenido.controller.js';
import { faqsRouter } from './faqs.routes.js';
import { trayectosRouter } from './trayectos.routes.js';
import { unidadesRouter, subunidadesRouter } from './unidades.routes.js';
import { textoLibro } from '../services/texto.service.js';
import { notFoundApi } from '../middleware/error-handler.js';
import { crearLaboRouter } from '../labo/routes.js';
import { servicioCorpus } from '../labo/instancia.js';

export const crearApiRouter = ({ servicio = servicioCorpus } = {}) => Router()
  .get('/health', h(health))
  .get('/contenido', h(getContenido))
  .get('/texto/EN_libro1_v8.txt', h(textoLibro))
  .use('/labo', crearLaboRouter({ servicio }))
  .use('/faqs', faqsRouter)
  .use('/trayectos', trayectosRouter)
  .use('/unidades', unidadesRouter)
  .use('/subunidades', subunidadesRouter)
  .use(notFoundApi);

export const apiRouter = crearApiRouter();
