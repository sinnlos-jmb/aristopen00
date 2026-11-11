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

export function siguientePregunta(sesion) {
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
  return {
    clave, texto: spec.texto,
    opciones: spec.opciones
      .filter(([v]) => clave !== 'destino' || v !== c.tema)
      .map(([valor, etiqueta]) => ({ valor, etiqueta })),
  };
}

export function responderOrientacion(sesion, valor) {
  if (sesion?.estado !== 'en_refinamiento') throw new Error('Esta orientación ya terminó.');
  const pregunta = siguientePregunta(sesion);
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
