import { Router } from 'express';
import { asyncHandler as h } from '../utils/async-handler.js';
import { requireEditor } from '../middleware/require-editor.js';
import * as c from '../controllers/faqs.controller.js';

export const faqsRouter = Router()
  .get('/', h(c.list))
  .post('/', requireEditor, h(c.create))
  .post('/importar', requireEditor, h(c.importar))
  .get('/:id', h(c.get))
  .put('/:id', requireEditor, h(c.update))
  .delete('/:id', requireEditor, h(c.remove))
  .get('/:id/trayectos', h(c.listTrayectos))
  .post('/:id/trayectos', requireEditor, h(c.createTrayecto));
