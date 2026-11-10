import * as faqs from '../services/faqs.service.js';
import * as trayectos from '../services/trayectos.service.js';
import { importar as importarFaqs } from '../services/faqs-import.service.js';

const flag = v => v === true || v === '1' || v === 'true' || v === 'si' || v === 'sí';

export const list = async (_req, res) => res.json(await faqs.list());
export const get = async (req, res) => res.json(await faqs.get(req.params.id));
export const create = async (req, res) => res.status(201).json(await faqs.create(req.body));
export const update = async (req, res) => res.json(await faqs.update(req.params.id, req.body));
export const remove = async (req, res) => { await faqs.remove(req.params.id); res.status(204).end(); };

export const listTrayectos = async (req, res) => res.json(await trayectos.listByFaq(req.params.id));
export const createTrayecto = async (req, res) => res.status(201).json(await trayectos.createDraft(req.params.id, req.body));

// POST /api/faqs/importar?modo=crear|actualizar|crear-o-actualizar&dryRun=1
// Cuerpo: lista de FAQ o { faqs, modo?, dryRun? }. Los parámetros de la URL tienen prioridad.
export const importar = async (req, res) => {
  const body = req.body;
  const modo = req.query.modo ?? body?.modo ?? 'crear';
  const dryRun = flag(req.query.dryRun ?? req.query.dry_run ?? body?.dryRun ?? false);
  const informe = await importarFaqs(body, { modo, dryRun });
  res.status(informe.ok || dryRun ? 200 : 422).json(informe);
};
