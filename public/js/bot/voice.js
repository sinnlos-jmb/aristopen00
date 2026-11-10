export const V = {
  greet: 'Antes de empezar, una idea: la filosofía no se lee, se piensa. Pide tiempo, atención y cierta disposición a no entender del todo durante un rato. Si tenés unos minutos, vale la pena.',
  bridge: (label) => `Para entender «${label}» hay que ir despacio: reponer primero algunos conceptos y avanzar sobre ellos. Vamos a intentarlo.`,
  genericBridge: 'Empecemos por lo básico: todo lo que hacemos tiende a algún bien. Repasemos algunos conceptos y, sobre esa base, vayamos avanzando.',
  detour: (label) => `Un alto en «${label}»:`,
  stepFallback: (titulo) => titulo,
  chapterClose: (u, next) => next
    ? `Cerramos «${u.titulo}». Ahora, «${next.titulo}».`
    : `Cerramos «${u.titulo}».`,
  momentShift: (m) => m.t ? `» ${m.titulo} — ${m.t}` : `» ${m.titulo}`,
  lateralFooter: (faqPregunta) => faqPregunta
    ? `\n\nPodés profundizar sobre esto con «${faqPregunta}» desde el botón ? de preguntas, o escribiendo tu propia consulta.`
    : `\n\nPodés profundizar sobre esto escribiendo tu propia consulta.`,
  closing: {
    done: 'Llegamos al concepto. Hasta acá por hoy. La filosofía se lee despacio y se piensa despacio: mucho de lo que dijimos se entiende recién en la segunda o tercera lectura, y algunas cosas no se entienden nunca del todo. Y eso está bien: pensar no es resolver. Volvé cuando quieras; el texto sigue ahí, esperando.',
    limit: 'Hasta acá por hoy. Lo que sigue se apoya en lo que ya recorrimos; conviene volver sobre esos pasos antes de seguir. La filosofía se lee despacio y se piensa despacio. Y eso está bien: pensar no es resolver. Volvé cuando quieras.',
  },
  fallbackQuestions: [
    '¿Cómo define Aristóteles la felicidad?',
    '¿Cuál es la función propia del ser humano?',
    '¿Por qué la felicidad es una actividad y no una disposición?',
    '¿Qué quiere decir que la felicidad es completa y autosuficiente?',
  ],
};