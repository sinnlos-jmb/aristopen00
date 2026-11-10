import { getPool } from '../utils/db.js';
import { notFound } from '../utils/http-error.js';
import * as unidadesRepo from '../repositories/unidades.repository.js';

export async function list() {
  const unidades = await unidadesRepo.listUnidades(getPool());
  return unidades.map(u => ({ id: u.id, titulo: u.titulo ?? null, estado: u.estado ?? null,
    subunidades: u.subunidades.map(s => ({ id: s.id, titulo: s.titulo ?? null, estado: s.estado ?? null })) }));
}

export async function get(id) {
  const u = await unidadesRepo.getUnidad(getPool(), id);
  if (!u) throw notFound(`No existe la unidad ${id}.`);
  return u;
}

export async function getSubunidad(id) {
  const s = await unidadesRepo.getSubunidad(getPool(), id);
  if (!s) throw notFound(`No existe la subunidad ${id}.`);
  return s;
}
