import { analyze, normalize } from './analyze.js';

// Interpretación de la forma de la pregunta. No asigna sentidos editoriales,
// causalidad real ni aristas: todos los vínculos son solicitudes del estudiante.
const REGLAS = [
  { operacion: 'distinguir', precision: 'diferencia', expresion: /\b(diferencias?|distingue|distinguir|distincion|comparar|comparacion)\b/ },
  { operacion: 'evaluar', precision: 'cualidad', expresion: /\b(mejor|peor|superior|mas importante|mas excelente)\b/ },
  { operacion: 'caracterizar', precision: 'cualidad', expresion: /\b(caracteriza|cualidades?|propiedades?|rasgos?|caracteristicas?)\b/ },
  { operacion: 'explicar_genesis', precision: 'genesis', expresion: /\b(como se adquiere|como se forma|como surge|como se genera|como nace|como se desarrolla)\b/ },
  { operacion: 'justificar', precision: 'fundamento', expresion: /\b(por que|fundamento|causa|origen)\b/ },
  { operacion: 'relacionar', precision: 'relacion', expresion: /\b(relacion entre|como se relacionan|relacion de|relacion con|que relacion|que tiene que ver)\b/ },
  { operacion: 'definir', precision: 'definicion', expresion: /\b(que es|que son|que significa|definicion|como define|que entiende por)\b/ },
];

export function interpretarInquietud(texto, analisis = analyze(texto)) {
  const normalizado = normalize(texto);
  const hallazgo = REGLAS.find(r => r.expresion.test(normalizado));
  const operacion = hallazgo?.operacion || analisis.primaryMode?.id || 'explorar';
  const precision = hallazgo?.precision || null;
  // «mejor» funciona aquí como comparador, no como una mención inequívoca al bien supremo.
  const conceptos = [...new Set(analisis.conceptos
    .filter(c => !(operacion === 'evaluar' && c.id === 'ariston' && c.word === 'mejor'))
    .map(c => c.id))];
  const multiple = conceptos.length >= 2;
  const forma = operacion === 'distinguir' && multiple ? 'comparacion_multiple'
    : operacion === 'evaluar' ? 'evaluacion'
    : multiple ? 'relacion_de_conceptos' : 'pregunta_focal';
  const relacionesSolicitadas = [];
  if (multiple && ['distinguir', 'relacionar'].includes(operacion)) {
    for (let i = 0; i < conceptos.length; i++) {
      for (let j = i + 1; j < conceptos.length; j++) {
        relacionesSolicitadas.push({ entre: [conceptos[i], conceptos[j]],
          estado: 'solicitada_no_verificada', dirigida: false });
      }
    }
  }
  const indicios = [];
  if (hallazgo) indicios.push({ texto: normalizado.match(hallazgo.expresion)?.[0] || '', funcion: 'operacion' });
  if (/\borigen del movimiento\b/.test(normalizado)) indicios.push({ texto: 'origen del movimiento', funcion: 'relacion_causal_sugerida' });
  return {
    version: 2, operacion, precision, forma, conceptos,
    relacionesSolicitadas, indicios,
    criterioEvaluacion: operacion === 'evaluar' ? 'no_precisado' : null,
    estado: 'hipotesis_de_lectura',
    advertencia: 'Las relaciones son solicitadas, no comprobadas. El sentido conceptual no se confirma léxicamente.',
  };
}

// Evidencia editorial opcional. Sólo se ofrece si la base trae definiciones
// identificables para el concepto; nunca se fabrican acepciones filosóficas.
export function definicionesDisponibles(S, concepto) {
  return (S?.DEFC?.[concepto] || [])
    .filter(d => d && typeof d.id === 'string')
    .map(d => ({ id: d.id, concepto, titulo: d.titulo || d.label || d.id,
      fuente: 'definicion_editorial' }));
}
