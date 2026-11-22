import { analyze } from './analyze.js';
import { interpretarInquietud } from './sentidos.js';
import { diagnosticarContinuidad, validarEvaluacionPiloto } from '../../shared/orientador-piloto.js';

// V2: conserva el contrato de consulta y agrega una lectura contextual provisional.
// Todas las transiciones devuelven una sesión nueva, sin mutar las anteriores.
export const ORIENTADOR_VERSION = 2;

const PREGUNTAS = Object.freeze({
  tema: {
    texto: '¿Qué tema querés explorar?',
    opciones: [['phusis', 'Naturaleza (phýsis)'], ['eudaimonia', 'Felicidad (eudaimonía)'], ['arete', 'Excelencia (areté)']],
  },
  intencion: {
    texto: '¿Qué te gustaría hacer con ese tema?',
    opciones: [['definir', 'Precisar su significado'], ['caracterizar', 'Examinar sus cualidades'], ['explorar', 'Explorarlo paso a paso'], ['relacionar', 'Relacionarlo con otro concepto'], ['distinguir', 'Distinguirlo de otros conceptos'], ['evaluar', 'Examinar su excelencia o valor'], ['justificar', 'Buscar su fundamento'], ['explicar_genesis', 'Comprender cómo surge o se adquiere']],
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
    opciones: [['tema', 'Comenzar por el concepto elegido'], ['sin_preferencia', 'Dejarlo abierto'], ['phusis', 'Comenzar por phýsis (si corresponde)']],
  },
});

const hasValue = value => value !== null && value !== undefined;
const idsIniciales = sesion => sesion.interpretacion?.conceptos || sesion.analisis.conceptosDetectados;
const nombreConcepto = (S, id) => S?.N?.[id]?.label || S?.FN?.[id]?.label ||
  PREGUNTAS.tema.opciones.find(([v]) => v === id)?.[1] || id;
const otrosIniciales = sesion => idsIniciales(sesion).includes(sesion.consulta.tema)
  ? idsIniciales(sesion).filter(id => id !== sesion.consulta.tema) : [];
const esRelacion = intencion => ['relacionar', 'distinguir'].includes(intencion);
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
  const interpretacion = interpretarInquietud(pregunta, analisis);
  // La lectura de V2 preserva la forma de la pregunta sin confirmar sus hipótesis.
  const conceptos = interpretacion.conceptos;
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
    interpretacion,
    aclaracionSentido: null,
    evaluacionPiloto: null,
    consulta: {
      tema: conceptos.length === 1 ? conceptos[0] : null,
      intencion: null, destino: null, conceptosRelacionados: [], nivel: null, extension: null, origen: null,
    },
    candidatos: [], // Se conectará al grafo y a las FAQ en V2.
    evaluacion: 'no_disponible_v1',
    bitacora: [],
  };
  sesion.bitacora = bitacora(sesion, 'inicio', {
    texto: pregunta,
    hipotesisTema: sesion.consulta.tema,
    intencionDetectada: sesion.analisis.intencionDetectada,
    interpretacionInicial: { operacion: interpretacion.operacion, forma: interpretacion.forma },
    nota: 'El léxico y la forma de la pregunta son hipótesis; ninguna preferencia se presupone.',
  });
  return sesion;
}

export function siguientePregunta(sesion, S = null) {
  if (!sesion || sesion.estado !== 'en_refinamiento') return null;
  const c = sesion.consulta;
  let clave = null;
  if (!hasValue(c.tema)) clave = 'tema';
  else if (!hasValue(c.intencion)) clave = 'intencion';
  else if (esRelacion(c.intencion) && !hasValue(c.destino) && !c.conceptosRelacionados?.length) clave = 'destino';
  else if (!hasValue(c.nivel)) clave = 'nivel';
  else if (!hasValue(c.extension)) clave = 'extension';
  else if (!hasValue(c.origen)) clave = 'origen';
  if (!clave) return null;
  const spec = PREGUNTAS[clave];
  const originales = spec.opciones
    .filter(([v]) => clave !== 'destino' || v !== c.tema)
    .map(([valor, etiqueta]) => ({ valor, etiqueta, fuente: 'opcion_general' }));
  if (clave === 'intencion') {
    const otros = otrosIniciales(sesion);
    const nombre = nombreConcepto(S, c.tema);
    const texto = otros.length
      ? `Empezando por ${nombre}, ¿qué querés indagar?`
      : spec.texto;
    const sugerida = sesion.interpretacion?.operacion;
    const opciones = originales.map(o => {
      if (otros.length && esRelacion(o.valor)) return {
        ...o, etiqueta: o.valor === 'distinguir'
          ? `Compararlo con ${otros.map(id => nombreConcepto(S, id)).join(' y ')}`
          : `Relacionarlo con ${otros.map(id => nombreConcepto(S, id)).join(' y ')}`,
      };
      return o;
    });
    const prioritaria = opciones.find(o => o.valor === sugerida);
    return { clave, texto, opciones: [
      ...(prioritaria ? [{ ...prioritaria, fuente: 'hipotesis_inicial' }] : []),
      ...opciones.filter(o => o.valor !== prioritaria?.valor),
    ] };
  }
  if (clave === 'tema') {
    const reconocidos = idsIniciales(sesion).map(id => ({
      valor: id, etiqueta: nombreConcepto(S, id), fuente: 'pregunta_inicial',
    }));
    // Si la pregunta ya nombró conceptos, no añadir opciones ajenas como si
    // formaran parte de la pregunta. «Otro concepto…» sigue disponible en la UI.
    if (reconocidos.length) return {
      clave, texto: '¿Por cuál de los conceptos mencionados querés empezar?',
      opciones: reconocidos,
      aclaracion: 'Elegir un punto de partida no elimina los demás conceptos de tu pregunta.',
    };
    return { clave, texto: spec.texto, opciones: originales };
  }
  if (clave === 'destino') {
    const reconocidos = (sesion.interpretacion?.conceptos || sesion.analisis.conceptosDetectados)
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
  const consulta = { ...sesion.consulta, [pregunta.clave]: valor };
  if (pregunta.clave === 'intencion') {
    consulta.conceptosRelacionados = esRelacion(valor) ? otrosIniciales(sesion) : [];
    consulta.destino = null;
  }
  const nueva = { ...sesion, consulta };
  nueva.bitacora = bitacora(nueva, 'respuesta', {
    pregunta: pregunta.clave,
    formulacion: pregunta.texto,
    opcion: { ...opcion },
    anterior: previo[pregunta.clave],
    efecto: consulta.conceptosRelacionados?.length && pregunta.clave === 'intencion'
      ? 'Se retoman los demás conceptos de la pregunta inicial sin suponer aristas entre ellos.'
      : `Se registra ${pregunta.clave}; la priorización de trayectos queda pendiente de V2/V3.`,
    ...(pregunta.clave === 'intencion' ? { conceptosRelacionados: [...consulta.conceptosRelacionados] } : {}),
  });
  return nueva;
}

// El estudiante puede precisar su acepción sin inventar un nodo o etiqueta editorial.
// Es opcional, reversible mediante una nueva precisión y queda en la bitácora.
export function precisarSentido(sesion, texto) {
  if (sesion?.estado !== 'en_refinamiento') throw new Error('Esta orientación ya terminó.');
  if (!hasValue(sesion.consulta.tema)) throw new Error('Elegí primero el tema.');
  const literal = String(texto || '').trim().replace(/\s+/g, ' ');
  if (!literal || literal.length > 400) throw new Error('Precisá el sentido entre 1 y 400 caracteres.');
  const nueva = { ...sesion, aclaracionSentido: literal };
  nueva.bitacora = bitacora(nueva, 'precision_sentido', {
    tema: nueva.consulta.tema, texto: literal, anterior: sesion.aclaracionSentido || null,
    fuente: 'texto_estudiante',
    nota: 'La precisión expresa el sentido buscado, sin acreditar una acepción editorial ni una arista.',
  });
  return nueva;
}

export function cerrarOrientacion(sesion, motivo) {
  if (sesion?.estado !== 'en_refinamiento') throw new Error('La sesión no está activa.');
  if (!['conforme', 'abandonado'].includes(motivo)) throw new Error('Cierre no reconocido.');
  const nueva = { ...sesion, estado: motivo, trazabilidadIntencion: diagnosticarContinuidad(sesion) };
  nueva.bitacora = bitacora(nueva, 'cierre', {
    motivo,
    completa: siguientePregunta(sesion) === null,
    nota: motivo === 'conforme'
      ? 'Conformidad con la consulta formulada; no implica aprobación de un trayecto.'
      : 'Abandono registrado sin inferir disconformidad.',
  });
  return nueva;
}

// La evaluación se puede guardar tras el cierre sin alterar la bitácora:
// su último evento debe seguir siendo 'cierre' para el contrato de persistencia.
export function registrarEvaluacionPiloto(sesion, respuestas) {
  if (!sesion || sesion.estado === 'en_refinamiento') throw new Error('La sesión debe estar cerrada.');
  return { ...sesion, evaluacionPiloto: validarEvaluacionPiloto(respuestas) };
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
