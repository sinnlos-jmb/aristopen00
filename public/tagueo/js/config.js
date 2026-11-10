// Rutas relativas a /tagueo/index.html
export const CONFIG = {
  datos: './data/',
  texto: 'EN_libro1_v8.txt',
  estatico: 'estatico_v1.json',    // árbol estático (neutral): contra él se taguea
  funcional: 'funcional_v1.json',  // red funcional (temática): la lectura funcional se deriva
  tags: 'tags_v4.json',
  grafos: '../grafos/',            // public/grafos (no se modifica)
  refsIndex: 'data/refs_index.json',
  graphIndex: 'js/grafos.index.js',
  polos: ['phusis', 'theion'],     // destinos de los trayectos funcionales
  // firmas de las FAQ (D35, D41): el mismo vocabulario que el constructor de preguntas del Labo
  // intención: [etiqueta, mínimo y máximo de objetos, admite aristas]
  intenciones: {
    explorar: ['Explorar un tema', 1, 1, true], definir: ['Qué es / qué significa', 1, 1, false], explicar: ['Explicar o desarrollar', 1, 1, true],
    justificar: ['Por qué / con qué fundamento', 1, 2, true], finalidad: ['Para qué / hacia qué fin', 1, 2, true], modo: ['Cómo / por qué camino', 1, 2, true],
    relacionar: ['Cómo se relacionan', 2, 3, true], distinguir: ['Qué diferencia hay', 2, 3, false], examinar: ['Examinar una afirmación', 1, 2, true],
    localizar: ['Dónde aparece / en qué pasaje', 1, 2, true], enumerar: ['Qué clases / cuántas clases', 1, 1, false]
  },
  operaciones: {abierta: 'revisar una afirmación', identidad: '¿X es lo mismo que Y?', condicion: '¿X es condición de Y?', suficiencia: '¿X basta para Y?', existencia: '¿hay X?'},
  rolesRespuesta: ['responde', 'matiza', 'contexto']
};
