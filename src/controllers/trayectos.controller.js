import * as trayectos from '../services/trayectos.service.js';

export const list = async (req, res) => res.json(await trayectos.list({ estado: req.query.estado || null }));
export const get = async (req, res) => res.json(await trayectos.get(req.params.id));
export const update = async (req, res) => res.json(await trayectos.updateDraft(req.params.id, req.body));
export const publish = async (req, res) => res.json(await trayectos.publish(req.params.id));
export const remove = async (req, res) => { await trayectos.remove(req.params.id); res.status(204).end(); };
