// Contrato puro compartido por navegador y registro voluntario.
// Una valoración del estudiante no es un juicio editorial sobre el corpus.
export const RESPUESTAS_PILOTO = Object.freeze({
  claridad: ['si', 'parcialmente', 'no'],
  fidelidad: ['si', 'en_parte', 'no'],
  influencia: ['ayudo_a_precisar', 'cambio_direccion', 'no_influyo', 'no_se'],
});

export function validarEvaluacionPiloto(valor) {
  if (valor == null) return null; // Participación optativa.
  if (typeof valor !== 'object' || Array.isArray(valor) || valor.version !== 1)
    throw new Error('Evaluación piloto inválida.');
  const limpia = { version: 1 };
  for (const [campo, opciones] of Object.entries(RESPUESTAS_PILOTO)) {
    if (!opciones.includes(valor[campo])) throw new Error(`Evaluación piloto inválida: ${campo}.`);
    limpia[campo] = valor[campo];
  }
  if (valor.comentario != null && typeof valor.comentario !== 'string')
    throw new Error('Evaluación piloto inválida: comentario.');
  const comentario = String(valor.comentario || '').trim();
  if (comentario.length > 400) throw new Error('Evaluación piloto inválida: comentario demasiado extenso.');
  limpia.comentario = comentario;
  return limpia;
}

// Describe el cambio entre las dos formulaciones. No explica sus causas
// ni equipara «distinguir» y «relacionar».
export function diagnosticarContinuidad(sesion) {
  const original = sesion?.interpretacion?.operacion || null;
  const elegida = sesion?.consulta?.intencion || null;
  const conceptosIniciales = [...new Set(sesion?.interpretacion?.conceptos || [])];
  const c = sesion?.consulta || {};
  const conceptosFinales = [...new Set([c.tema, ...(c.conceptosRelacionados || []), c.destino]
    .filter(v => typeof v === 'string' && v.trim()))];
  return {
    operacionInicial: original,
    operacionElegida: elegida,
    cambio: !original || !elegida ? 'sin_determinar' : original === elegida ? 'conservada' : 'distinta',
    precisionInicial: sesion?.interpretacion?.precision || null,
    conceptosIniciales,
    conceptosFinales,
    conceptosNoRetomados: conceptosIniciales.filter(id => !conceptosFinales.includes(id)),
    distincionPendiente: original === 'distinguir' && elegida === 'relacionar',
    origenPedagogico: c.origen || null,
    nota: 'Diagnóstico descriptivo, no prueba de comprensión ni de influencia de las sugerencias.',
  };
}

// Conteos exploratorios de archivos exportados. Nunca incluyen texto de las
// preguntas ni comentarios en el resultado agregado.
export function resumirPiloto(sesiones) {
  const conteos = valores => valores.reduce((obj, valor) => {
    const clave = valor || 'sin_dato';
    obj[clave] = (obj[clave] || 0) + 1;
    return obj;
  }, Object.create(null));
  const validas = sesiones.filter(s => s && typeof s === 'object' && s.version === 2 && s.consulta);
  const evaluadas = validas.map(s => s.evaluacionPiloto).filter(Boolean);
  const continuidades = validas.map(diagnosticarContinuidad);
  return {
    sesionesV2: validas.length,
    evaluacionesCompletadas: evaluadas.length,
    cierres: conteos(validas.map(s => s.estado)),
    cambiosOperacion: conteos(continuidades.map(c => c.cambio)),
    comparacionesInicialesReformuladasComoRelacion: continuidades.filter(c => c.distincionPendiente).length,
    origenPedagogico: conteos(continuidades.map(c => c.origenPedagogico)),
    claridad: conteos(evaluadas.map(e => e.claridad)),
    fidelidad: conteos(evaluadas.map(e => e.fidelidad)),
    influenciaPercibida: conteos(evaluadas.map(e => e.influencia)),
    advertencia: 'Frecuencias descriptivas de una muestra voluntaria. No miden comprensión ni causalidad.',
  };
}
