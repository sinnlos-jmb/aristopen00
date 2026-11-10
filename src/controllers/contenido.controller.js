import * as contenido from '../services/contenido.service.js';

export async function getContenido(req, res) {
  const { bundle, at } = await contenido.getContenido();
  res.set('Cache-Control', 'no-cache').set('X-Contenido-Generado', at).json(bundle);
}
