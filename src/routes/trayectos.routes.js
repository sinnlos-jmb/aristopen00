import { Router } from 'express';
import { asyncHandler as h } from '../utils/async-handler.js';
import { requireEditor } from '../middleware/require-editor.js';
import * as c from '../controllers/trayectos.controller.js';

export const trayectosRouter = Router()
  .get('/', h(c.list))
  .get('/:id', h(c.get))
  .put('/:id', requireEditor, h(c.update))
  .delete('/:id', requireEditor, h(c.remove))
  .post('/:id/publicar', requireEditor, h(c.publish));
