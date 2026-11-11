import { analyze } from './analyze.js';

// V1: contrato de consulta y bitácora; NO calcula trayectos ni interpreta tags.
// Todas las transiciones devuelven una sesión nueva, sin mutar las anteriores.
export const ORIENTADOR_VERSION = 1;

const PREGUNTAS = Object.freeze({
  tema: {
    texto: '¿Qué tema querés explorar?',
    opciones: [['phusis', 'Naturaleza (phýsis)'], ['eudaimonia', 'Felicidad (eudaimonía)'], ['arete', 'Excelencia (areté)']],
  },
  intencion: {
    texto: '¿Qué te gustaría hacer con ese tema?',
    opciones: [['definir', 'Precisar su significado'], ['explorar', 'Explorarlo paso a paso'], ['relacionar', 'Relacionarlo con otro concepto']],
  },
  destino: {
    texto: '¿Con qué concepto querés relacionarlo?',
    opciones: [['eudaimonia', 'Felicidad (eudaimonía)'], ['arete', 'Excelencia (areté)'], ['phusis', 'Naturaleza (phýsis)']],
  },
  nivel: {
    texto: '¿Desde qué punto partimos?',
    opciones: [['principiante', 'Desde cero'], ['intermedio', 'Con algunas nociones'], ['sin_preferencia', 'Prefiero no precisarlo']],
  },
  extension: {
    texto: '¿Qué extensión preferís?',
    opciones: [['breve', 'Un trayecto conciso'], ['extensa', 'Un recorrido extenso'], ['sin_preferencia', 'Sin preferencia']],
  },
  origen: {
    texto: '¿Querés fijar un punto de partida pedagógico?',
    opciones: [['phusis', 'Comenzar por phýsis'], ['tema', 'Comenzar por el tema elegido'], ['sin_preferencia', 'Dejarlo abierto']],
  },
});

const hasValue = value => value !== null && value !== undefined;
const clone = value => JSON.parse(JSON.stringify(value));

function bitacora(sesion, tipo, datos) {
  return [...sesion.bitacora, {
    numero: sesion.bitacora.length + 1,
    tipo,
    datos: clone(datos),
    consulta: clone(sesion.consulta),
    estado: sesion.estado,
  }];
}

// Sugerencias documentales de un salto: respetan la dirección de cada arista.
// No son trayectos validados ni infieren reciprocidad entre los conceptos.
export function sugerirRelaciones(S, tema, omitidos = []) {
  if (!tema || !S?.FE?.length) return [];
  const omitir = new Set([tema, ...omitidos]);
  const anclas = new Set([tema, ...(S.REM?.[tema] || [])]);
  // Los remite_a funcionales pueden portar sufijos de sentido (concepto#sentido).
  for (const [id, nodo] of Object.entries(S.FN || {})) {
    if ((nodo.remite_a || []).some(r => r.split('#')[0] === tema)) anclas.add(id);
  }
  const encontrados = new Map();
  for (const edge of S.FE) {
    let otro, direccion, nodo;
    if (anclas.has(edge.de)) { otro = edge.a; direccion = 'saliente'; nodo = edge.de; }
    else if (anclas.has(edge.a)) { otro = edge.de; direccion = 'entrante'; nodo = edge.a; }
    else continue;
    const conceptos = [otro, ...(S.FN?.[otro]?.remite_a || []).map(r => r.split('#')[0])];
    const id = conceptos.find(c => !omitir.has(c) && (S.N?.[c] || S.FN?.[c])) || (omitir.has(otro) ? null : otro);
    if (!id || omitir.has(id) || encontrados.has(id)) continue;
    encontrados.set(id, {
      valor: id,
      etiqueta: S.N?.[id]?.label || S.FN?.[id]?.label || id,
      fuente: 'arista_funcional',
      direccion,
      relacion: edge.rel || null,
      de: edge.de,
      a: edge.a,
      ref: edge.ref || null,
      voz: edge.voz || null,
      ancla: nodo,
    });
  }
  return [...encontrados.values()];
}

// Catálogo elegible del corpus: nodos estáticos, funcionales y extremos de aristas.
// Una etiqueta coincidente no demuestra una conexión filosófica con el tema elegido.
export function buscarConceptos(S, texto, tema = null, limit = 12) {
  const norm = s => String(s || '').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').trim();
  const consulta = norm(texto);
  if (!consulta) return [];
  const candidatos = new Map();
  for (const [tipo, nodos] of [['estatico', S?.N], ['funcional', S?.FN]]) {
    for (const [id, nodo] of Object.entries(nodos || {})) {
      if (id === tema) continue;
      const previo = candidatos.get(id);
      if (!previo) candidatos.set(id, {
        valor: id, etiqueta: nodo.label || id, fuente: 'catalogo_conceptos', clase: tipo,
        griego: nodo.gr || null,
      });
    }
  }
  // Sólo son elegibles los extremos con un registro de nodo conocido.
  const links = sugerirRelaciones(S, tema);
  for (const link of links) {
    if (candidatos.has(link.valor)) candidatos.get(link.valor).vinculo = link;
  }
  return [...candidatos.values()]
    .filter(o => [o.valor, o.etiqueta, o.griego].some(t => norm(t).includes(consulta)))
    .sort((a, b) => {
      const startA = [a.valor, a.etiqueta, a.griego].some(t => norm(t).startsWith(consulta));
      const startB = [b.valor, b.etiqueta, b.griego].some(t => norm(t).startsWith(consulta));
      return Number(startB) - Number(startA) || Number(!!b.vinculo) - Number(!!a.vinculo)
        || a.etiqueta.localeCompare(b.etiqueta, 'es');
    }).slice(0, Math.max(0, Math.min(limit, 30)));
}

// Registrar una elección libre sin perder su literalidad. Si coincide con un nodo
// conocido, conserva su ID y la procedencia del catálogo; de otro modo mantiene texto.
export function responderLibre(sesion, texto, S = null, elegidoId = null) {
  if (sesion?.estado !== 'en_refinamiento') throw new Error('Esta orientación ya terminó.');
  const pregunta = siguientePregunta(sesion, S);
  if (!pregunta || !['tema', 'destino'].includes(pregunta.clave)) throw new Error('No se admite texto libre en este paso.');
  const literal = String(texto || '').trim().replace(/\s+/g, ' ');
  if (!literal || literal.length > 400) throw new Error('Escribí entre 1 y 400 caracteres.');
  const normal = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const exacto = !elegidoId && buscarConceptos(S, literal, sesion.consulta.tema, 30)
    .find(o => [o.valor, o.etiqueta, o.griego].some(t => normal(t) === normal(literal)));
  const id = elegidoId || exacto?.valor || null;
  const nodo = id && (S?.N?.[id] || S?.FN?.[id]);
  if (id && (!nodo || id === sesion.consulta.tema)) throw new Error('Concepto seleccionado inválido.');
  const opcion = nodo
    ? { valor: id, etiqueta: nodo.label || id, fuente: 'catalogo_conceptos', textoBuscado: literal,
        vinculo: sugerirRelaciones(S, sesion.consulta.tema).find(x => x.valor === id) || null }
    : { valor: literal, etiqueta: literal, fuente: 'texto_libre', textoBuscado: literal, sinCoincidencia: true };
  const nueva = { ...sesion, consulta: { ...sesion.consulta, [pregunta.clave]: opcion.valor } };
  nueva.bitacora = bitacora(nueva, 'respuesta', {
    pregunta: pregunta.clave, formulacion: pregunta.texto, opcion,
    anterior: sesion.consulta[pregunta.clave],
    efecto: nodo ? 'Seleccionado del catálogo; la validación de trayectos sigue pendiente.'
      : 'Texto libre sin nodo identificado; requiere revisión editorial para conectar con el grafo.',
  });
  return nueva;
}

export function iniciarOrientacion(texto) {
  const pregunta = String(texto || '').trim();
  if (!pregunta) throw new Error('Escribí primero tu inquietud.');
  const analisis = analyze(pregunta);
  // Una detección léxica es una hipótesis inicial, no una interpretación confirmada.
  const conceptos = [...new Set(analisis.conceptos.map(c => c.id))];
  const sesion = {
    version: ORIENTADOR_VERSION,
    estado: 'en_refinamiento',
    textoInicial: pregunta,
    analisis: {
      normalizado: analisis.normalized,
      conceptosDetectados: conceptos,
      activadores: analisis.conceptos.map(c => ({ id: c.id, palabra: c.word })),
      intencionDetectada: analisis.primaryMode?.id || null,
    },
    consulta: {
      tema: conceptos.length === 1 ? conceptos[0] : null,
      intencion: null, destino: null, nivel: null, extension: null, origen: null,
    },
    candidatos: [], // Se conectará al grafo y a las FAQ en V2.
    evaluacion: 'no_disponible_v1',
    bitacora: [],
  };
  sesion.bitacora = bitacora(sesion, 'inicio', {
    texto: pregunta,
    hipotesisTema: sesion.consulta.tema,
    intencionDetectada: sesion.analisis.intencionDetectada,
    nota: 'El léxico aporta una hipótesis; ninguna preferencia se presupone.',
  });
  return sesion;
}

export function siguientePregunta(sesion, S = null) {
  if (!sesion || sesion.estado !== 'en_refinamiento') return null;
  const c = sesion.consulta;
  let clave = null;
  if (!hasValue(c.tema)) clave = 'tema';
  else if (!hasValue(c.intencion)) clave = 'intencion';
  else if (c.intencion === 'relacionar' && !hasValue(c.destino)) clave = 'destino';
  else if (!hasValue(c.nivel)) clave = 'nivel';
  else if (!hasValue(c.extension)) clave = 'extension';
  else if (!hasValue(c.origen)) clave = 'origen';
  if (!clave) return null;
  const spec = PREGUNTAS[clave];
  const originales = spec.opciones
    .filter(([v]) => clave !== 'destino' || v !== c.tema)
    .map(([valor, etiqueta]) => ({ valor, etiqueta, fuente: 'opcion_general' }));
  if (clave === 'tema') {
    const reconocidos = sesion.analisis.conceptosDetectados.map(id => ({
      valor: id, etiqueta: S?.N?.[id]?.label || S?.FN?.[id]?.label || originales.find(o => o.valor === id)?.etiqueta || id,
      fuente: 'pregunta_inicial',
    }));
    const unicos = new Map();
    for (const opcion of [...reconocidos, ...originales]) {
      if (!unicos.has(opcion.valor)) unicos.set(opcion.valor, opcion);
    }
    return { clave, texto: spec.texto, opciones: [...unicos.values()] };
  }
  if (clave === 'destino') {
    const reconocidos = sesion.analisis.conceptosDetectados
      .filter(id => id !== c.tema)
      .map(id => ({ valor: id, etiqueta: S?.N?.[id]?.label || S?.FN?.[id]?.label || originales.find(o => o.valor === id)?.etiqueta || id, fuente: 'pregunta_inicial' }));
    const aristas = sugerirRelaciones(S, c.tema).slice(0, 8);
    for (const reconocido of reconocidos) {
      const arista = aristas.find(a => a.valor === reconocido.valor);
      if (arista) reconocido.vinculo = { direccion: arista.direccion, de: arista.de, a: arista.a, relacion: arista.relacion, ref: arista.ref };
    }
    const unicos = new Map();
    for (const opcion of [...reconocidos, ...aristas, ...originales]) {
      if (opcion.valor !== c.tema && !unicos.has(opcion.valor)) unicos.set(opcion.valor, opcion);
    }
    return { clave, texto: spec.texto, opciones: [...unicos.values()].slice(0, 12) };
  }
  return { clave, texto: spec.texto, opciones: originales };
}

export function responderOrientacion(sesion, valor, S = null) {
  if (sesion?.estado !== 'en_refinamiento') throw new Error('Esta orientación ya terminó.');
  const pregunta = siguientePregunta(sesion, S);
  if (!pregunta) throw new Error('La consulta está completa. Podés confirmar o abandonar.');
  const opcion = pregunta.opciones.find(o => o.valor === valor);
  if (!opcion) throw new Error('Opción no válida para la pregunta actual.');
  const previo = clone(sesion.consulta);
  const nueva = { ...sesion, consulta: { ...sesion.consulta, [pregunta.clave]: valor } };
  nueva.bitacora = bitacora(nueva, 'respuesta', {
    pregunta: pregunta.clave,
    formulacion: pregunta.texto,
    opcion: { ...opcion },
    anterior: previo[pregunta.clave],
    efecto: `Se registra ${pregunta.clave}; la priorización de trayectos queda pendiente de V2/V3.`,
  });
  return nueva;
}

export function cerrarOrientacion(sesion, motivo) {
  if (sesion?.estado !== 'en_refinamiento') throw new Error('La sesión no está activa.');
  if (!['conforme', 'abandonado'].includes(motivo)) throw new Error('Cierre no reconocido.');
  const nueva = { ...sesion, estado: motivo };
  nueva.bitacora = bitacora(nueva, 'cierre', {
    motivo,
    completa: siguientePregunta(sesion) === null,
    nota: motivo === 'conforme'
      ? 'Conformidad con la consulta formulada; no implica aprobación de un trayecto.'
      : 'Abandono registrado sin inferir disconformidad.',
  });
  return nueva;
}

export function resumenOrientacion(sesion) {
  const pendiente = siguientePregunta(sesion);
  return {
    estado: sesion.estado,
    consulta: clone(sesion.consulta),
    siguiente: pendiente?.clave || null,
    decisiones: sesion.bitacora.length,
    candidatos: sesion.candidatos.length,
    advertencia: 'V1 no genera ni puntúa trayectos; los conceptos reconocidos son hipótesis léxicas.',
  };
}
