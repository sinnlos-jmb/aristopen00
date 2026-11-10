import { Router } from 'express';
import { asyncHandler as h } from '../utils/async-handler.js';
import * as c from '../controllers/unidades.controller.js';

export const unidadesRouter = Router()
  .get('/', h(c.list))
  .get('/:id', h(c.get));

export const subunidadesRouter = Router()
  .get('/:id', h(c.getSubunidad));
