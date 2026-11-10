import * as unidades from '../services/unidades.service.js';

export const list = async (_req, res) => res.json(await unidades.list());
export const get = async (req, res) => res.json(await unidades.get(req.params.id));
export const getSubunidad = async (req, res) => res.json(await unidades.getSubunidad(req.params.id));
