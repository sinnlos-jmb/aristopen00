import { diagnosticarContinuidad, validarEvaluacionPiloto } from '../../public/shared/orientador-piloto.js';
const norm = value => String(value || '').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ')
  .replace(/\s+/g, ' ').trim();
const allowed = new Set(['conforme', 'abandonado']);
const keyNames = ['tema', 'intencion', 'destino', 'nivel', 'extension', 'origen'];

// No aceptar etiquetas "match" declaradas por el cliente. Sólo igualdad textual
// de pregunta o variante de una FAQ (el detector semántico será una fase separada).
export function clasificarFaq(texto, faqs) {
  const query = norm(texto);
  const coincidencias = [];
  for (const faq of faqs) {
    const tipo = norm(faq.pregunta) === query ? 'pregunta' :
      (faq.variantes || []).some(v => norm(v) === query) ? 'variante' : null;
    if (tipo) coincidencias.push({ id: faq.id, tipo });
  }
  if (coincidencias.length > 1) return { estado: 'multiple', faqId: null, detalles: coincidencias };
  if (coincidencias.length === 1) return { estado: coincidencias[0].tipo, faqId: coincidencias[0].id, detalles: coincidencias };
  return { estado: 'sin_match_exacto', faqId: null, detalles: [] };
}

export function validarQuery(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Cuerpo inválido.');
  const texto = payload.textoInicial;
  if (typeof texto !== 'string' || !texto.trim() || texto.length > 400) throw new Error('Inquietud inicial inválida.');
  if (!allowed.has(payload.estado)) throw new Error('La sesión debe estar cerrada.');
  if (!payload.consulta || typeof payload.consulta !== 'object' || Array.isArray(payload.consulta)) throw new Error('Consulta inválida.');
  const consulta = {};
  for (const key of keyNames) {
    const value = payload.consulta[key];
    if (value !== null && (typeof value !== 'string' || !value.trim() || value.length > 400)) throw new Error(`Valor inválido: ${key}.`);
    consulta[key] = value;
  }
  // V2: varios conceptos relacionados. Mantener 'destino' para consultas V1
  // con un único destinatario, sin fingir que una lista es un nodo único.
  const relacionados = payload.consulta.conceptosRelacionados;
  if (relacionados !== undefined) {
    if (!Array.isArray(relacionados) || relacionados.length > 15 ||
      !relacionados.every(id => typeof id === 'string' && id.trim() && id.length <= 80))
      throw new Error('Conceptos relacionados inválidos.');
    consulta.conceptosRelacionados = [...new Set(relacionados)];
  }
  if (!Array.isArray(payload.bitacora) || payload.bitacora.length < 2 || payload.bitacora.length > 30) throw new Error('Bitácora inválida.');
  const final = payload.bitacora.at(-1);
  if (final?.tipo !== 'cierre' || final?.estado !== payload.estado) throw new Error('Falta el cierre de la sesión.');
  const sentido = payload.aclaracionSentido;
  if (sentido != null && (typeof sentido !== 'string' || !sentido.trim() || sentido.length > 400))
    throw new Error('Sentido inválido.');
  const lectura = payload.interpretacion;
  let interpretacion = null;
  if (lectura != null) {
    if (!lectura || typeof lectura !== 'object' || Array.isArray(lectura) || lectura.version !== 2)
      throw new Error('Interpretación inválida.');
    const textoBreve = v => typeof v === 'string' && v.length <= 80 ? v : null;
    const conceptos = lectura.conceptos;
    if (!Array.isArray(conceptos) || conceptos.length > 15 ||
      !conceptos.every(c => typeof c === 'string' && c.length <= 80))
      throw new Error('Conceptos de interpretación inválidos.');
    interpretacion = { version: 2, operacion: textoBreve(lectura.operacion),
      precision: textoBreve(lectura.precision), forma: textoBreve(lectura.forma),
      conceptos: [...new Set(conceptos)] };
  }
  const agregados = payload.bitacora.filter(e => e?.tipo === 'respuesta' && e?.datos?.opcion?.fuente === 'texto_libre')
    .map(e => ({ campo: e.datos.pregunta, texto: e.datos.opcion.textoBuscado }))
    .filter(e => keyNames.includes(e.campo) && typeof e.texto === 'string' && e.texto.length > 0 && e.texto.length <= 400);
  const evaluacionPiloto = validarEvaluacionPiloto(payload.evaluacionPiloto);
  const trazabilidadIntencion = interpretacion ? diagnosticarContinuidad({ interpretacion, consulta }) : null;
  return { textoInicial: texto.trim(), estado: payload.estado, consulta, agregados,
    aclaracionSentido: sentido?.trim() || null, interpretacion, evaluacionPiloto, trazabilidadIntencion };
}

