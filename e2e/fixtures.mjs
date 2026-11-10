// Corpus mínimo y ficticio. No accede a MariaDB ni contiene traducciones reales.
export const contenido = {
  tags: {
    version: 'E2E fixture',
    unidades: [],
    faqs: [{ id: 'faq-demo', pregunta: '¿Qué es el bien?' }],
    conceptos: [], pilares: [], claves: [], definiciones: [], parrafos: [],
    mapa: { super_unidades: [], libro_tagueado: 'I' },
  },
  funcional: { categorias: [], aristas: [] },
  estatico: { raices: [] },
  manual: { por_concepto: {}, por_arista: {} },
  argumentos: { argumentos: {} },
  trayectos: { trayectos: [] },
};

export const texto = [
  '1',
  '{"parrafo_nro":1}',
  'Toda acción humana tiende a algún bien.',
  '1094a [1] Πᾶσα τέχνη καὶ πᾶσα μέθοδος ἀγαθοῦ τινὸς ἐφίεσθαι δοκεῖ.',
].join('\n');
