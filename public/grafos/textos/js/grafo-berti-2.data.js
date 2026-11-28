'use strict';
// Grafo 2 (propuestas superadoras) \u00b7 El bien \u00b7 Enrico Berti, Il bene (v2). Datos; el motor es el compartido grafos.js.
// Capas: doxografia (Berti, con paragrafo citado) y lectura propia (marcada en cada ficha).

const NODES = [

  /* ===== Contexto: el mapa general, sin desplegar ===== */

  { id:"bene", label:"El bien", gr:"il bene", x:0, y:-320, r:56, type:"macro",
    desc:"El asunto. Berti no arranca definiendo el bien sino constatando que la palabra desapareció del vocabulario filosófico: ya Kant en 1788 escribía que la cuestión del sumo bien parecía haber caído en desuso. La pregunta, en cambio, sigue viva fuera de la filosofía. Todo el libro es el intento de volver a hacerla filosóficamente legítima.",
    ref:"Berti, Il bene §3–7" },
  { id:"problema", label:"El problema", gr:"senso della vita", x:-306, y:-85, r:46, type:"condition",
    desc:"Los filósofos dejaron de hablar del bien; los jóvenes siguen preguntando para qué vale la pena vivir. Berti registra ese desajuste: a las preguntas por el qué y el cómo vuelven a sumarse las del porqué y el para qué. El problema del bien reaparece disfrazado de problema del sentido de la vida.",
    ref:"Berti §3–6" },
  { id:"componentes", label:"Componentes", gr:"de la respuesta", x:-68, y:-94, r:56, type:"macro",
    desc:"El bien es el fin y la perfección del hombre: el método dialógico y los cuatro principios irrenunciables. Esta rama se despliega en el mapa general.",
    ref:"Berti §14–15, §24, §112" },
  { id:"superadoras", label:"Propuestas superadoras", gr:"due uscite", x:181, y:-75, r:54, type:"macro",
    desc:"Las dos salidas, una al lado de la otra. Comparten el diagnóstico: la concepción clásica se perdió y un retorno sin más sería inactual. Discrepan en qué hay que recuperar primero, y por eso conviene leerlas juntas.",
    ref:"Berti §111–115 · Lectura propia" },

  /* ===== Rama Berti ===== */

  { id:"berti", label:"Berti", gr:"non un ritorno", x:12, y:129, r:52, type:"macro",
    desc:"No propone volver atrás: un retorno que no se haga cargo de la distancia histórica sería inactual y poco convincente. Propone retener tres adquisiciones, anclar la ética a una metafísica y aprovechar la rehabilitación de la filosofía práctica. Lo que queda por hacer es construir esa metafísica nueva.",
    ref:"Berti §111–115" },
  { id:"tre", label:"Tres adquisiciones", gr:"irrinunciabili", x:-199, y:293, r:56,
    desc:"Primera: una concepción del hombre válida universalmente, capaz de indicar un fin aceptable y realizable por todos. Segunda: la dimensión social, porque el bien del individuo no se realiza sin los otros y por eso los incluye. Tercera: un bien absoluto que trasciende a la sociedad, que ella no puede asumir como fin propio pero debe respetar y hacer practicable.",
    ref:"Berti §112" },
  { id:"ancoraggio", label:"Ética anclada", gr:"ancorata, non dedotta", x:-84, y:359, r:46,
    desc:"La ética tiene que estar ligada a una metafísica para no caer ni en el arbitrio de Sartre ni en el formalismo de Kant, pero no puede deducirse de ella como de una ciencia exacta. La palabra de Berti es anclaje. Ahí se separa de la escolástica deductiva que Kant tenía enfrente cuando rechazó la tradición.",
    ref:"Berti §113" },
  { id:"filosofia_pratica", label:"Filosofía práctica", gr:"φρόνησις", x:35, y:355, r:46,
    desc:"La rehabilitación alemana de los años setenta —Strauss, Voegelin, Arendt, Gadamer, Ritter— recupera la razón práctica aristotélica: no ciencia demostrativa sino discurso racional basado en la experiencia y en la discusión a partir de las opiniones acreditadas. Berti la aprueba y le marca el faltante: no advierte que necesita una filosofía teórica que la funde.",
    ref:"Berti §114–115" },
  { id:"nuova_metafisica", label:"Nueva metafísica", gr:"il compito", x:196, y:244, r:46, type:"condition",
    desc:"La verdadera tarea pendiente: una metafísica rigurosamente crítica, inmune a los defectos que hicieron abandonar las anteriores, fundada cada vez de nuevo. Berti la enuncia y no la hace. Es la puerta por donde entra una propuesta propia.",
    ref:"Berti §115" },

  /* ===== Rama nuestra ===== */

  { id:"nuestra", label:"Nuestra idea", gr:"realismo naturalista", x:383, y:138, r:52, type:"bridge",
    desc:"Aceptamos el diagnóstico y el anclaje metafísico; discrepamos en el contenido. Lo primero que hay que recuperar no es el fin sino el acto. La phúsis pone el impulso y mide la obra; lo divino atrae sin mandar. La fórmula es separado pero no legislador: hay trascendencia y no hay legislación.",
    ref:"Lectura propia" },
  { id:"phusis", label:"Phúsis", gr:"φύσις", x:730, y:221, r:48, type:"originary",
    desc:"Naturaleza como principio interno de movimiento y como forma-fin. Impulsa hacia la areté de manera formal y potencial, igual para todos los individuos de la especie. No es un valor ni una norma: es lo que hace que haya algo que realizar. Lo que cambian las épocas son las condiciones de realización, no el érgon.",
    ref:"Lectura propia · Phys. II.1" },
  { id:"theion", label:"Lo divino", gr:"τὸ θεῖον", x:660, y:340, r:48, type:"originary",
    desc:"Acto puro, indiferente, que atrae siendo comprendido. No da órdenes ni ofrece un modelo para copiar: es hóros, criterio, no paradeigma. El bien divino no se realiza, se participa. No son los dioses de Homero ni la idea separada de Platón: separado pero no legislador.",
    ref:"Lectura propia · EE VIII.3; Met. XII.7" },
  { id:"energeia_recuperata", label:"Acto recuperado", gr:"ἐνέργεια", x:451, y:395, r:46,
    desc:"Tomás y Maritain restauran la naturaleza, el fin y el bien común, pero dejan el acto subordinado: la obra ya no es el fin, es la vía. Recuperar la enérgeia como medida —el bien no se sabe ni se postula, se lleva a término— es lo que permite leer cada desvío como la pérdida de un eslabón determinado y no como una opinión más. Retoma el nodo Acto de la cadena aristotélica, en el mapa general: allá la enérgeia está planteada, acá se la vuelve a poner como medida.",
    ref:"Lectura propia" },
  { id:"dissenso", label:"Desacuerdo", gr:"la distanza", x:334, y:380, r:44, type:"condition",
    desc:"Berti lee la historia como continuidad de la concepción clásica en Agustín, Tomás, Rosmini y Maritain. Sostenemos que la phúsis y la enérgeia se perdieron casi por completo fuera del mundo griego ateniense, y que los restauradores no las comprenden en su significación originaria. La restauración es real; lo recuperado no es lo mismo.",
    ref:"Lectura propia" }

];

const EDGES = [

  { id:'bene--problema', source:'bene', target:'problema', label:'senso', title:'El problema que queda',
    desc:'El bien sali\u00f3 del vocabulario de los fil\u00f3sofos y volvi\u00f3 por otro lado, como pregunta por el sentido de la vida. La arista marca ese desplazamiento: no cambi\u00f3 el problema, cambi\u00f3 qui\u00e9n lo formula.',
    ref:'Berti \u00a73\u20136', rel:'planteo' },

  { id:'bene--componentes', source:'bene', target:'componentes', label:'risposta', title:'Qu\u00e9 es el bien',
    desc:'La respuesta que Berti sostiene a lo largo de todo el libro, aunque la formule reci\u00e9n en la conclusi\u00f3n: el bien es el fin y la perfecci\u00f3n del hombre.',
    ref:'Berti \u00a714, \u00a724, \u00a7112', rel:'tesis' },

  { id:'bene--superadoras', source:'bene', target:'superadoras', label:'oltre', title:'Las dos salidas',
    desc:'Del mismo asunto salen las dos propuestas que intentan superar la situaci\u00f3n: la de Berti y la nuestra. No son una etapa m\u00e1s de la historia sino respuestas a ella.',
    ref:'Berti \u00a7111\u2013115 \u00b7 Lectura propia' },

  { id:'superadoras--berti', source:'superadoras', target:'berti', label:'proposta', title:'La salida de Berti',
    desc:'Retener las tres adquisiciones, anclar la \u00e9tica a una metaf\u00edsica y aprovechar la rehabilitaci\u00f3n de la filosof\u00eda pr\u00e1ctica. Lo que queda por hacer es construir esa metaf\u00edsica nueva.',
    ref:'Berti \u00a7111\u2013115' },

  { id:'superadoras--nuestra', source:'superadoras', target:'nuestra', label:'nostra', title:'Nuestra salida',
    desc:'Capa propia. Aceptamos el diagn\u00f3stico y el anclaje metaf\u00edsico, pero cambiamos el orden: lo primero que hay que recuperar es el acto, no el fin. Es punteada porque no pertenece al libro.',
    ref:'Lectura propia', rel:'lectura propia', kind:'potential' },

  { id:'berti--tre', source:'berti', target:'tre', label:'acquisizioni', title:'Lo irrenunciable',
    desc:'Concepci\u00f3n universal del hombre, dimensi\u00f3n social y referencia a un bien absoluto. Berti no pide adherir a una escuela: pide no perder estas tres cosas.',
    ref:'Berti \u00a7112', rel:'propuesta' },

  { id:'berti--ancoraggio', source:'berti', target:'ancoraggio', label:'ancora', title:'Ligada, no deducida',
    desc:'La \u00e9tica necesita una metaf\u00edsica para no caer en el arbitrio ni en el formalismo, pero no se deduce de ella. La imagen del anclaje es suya y es deliberadamente d\u00e9bil.',
    ref:'Berti \u00a7113', rel:'propuesta' },

  { id:'berti--pratica', source:'berti', target:'filosofia_pratica', label:'\u03c6\u03c1\u03cc\u03bd\u03b7\u03c3\u03b9\u03c2', title:'La v\u00eda practicable hoy',
    desc:'La rehabilitaci\u00f3n alemana de la filosof\u00eda pr\u00e1ctica le parece la indicaci\u00f3n m\u00e1s interesante por actual, por cl\u00e1sica y por persuasiva.',
    ref:'Berti \u00a7114', rel:'propuesta' },

  { id:'pratica--metafisica', source:'filosofia_pratica', target:'nuova_metafisica', label:'compito', title:'Lo que falta',
    desc:'A la rehabilitaci\u00f3n le falta lo que Arist\u00f3teles s\u00ed ten\u00eda: una filosof\u00eda te\u00f3rica donde fundarse. Construirla es, para Berti, la verdadera empresa pendiente.',
    ref:'Berti \u00a7115', rel:'l\u00edmite' },

  { id:'metafisica--nuestra', source:'nuova_metafisica', target:'nuestra', label:'ripresa', title:'Por d\u00f3nde entramos',
    desc:'Capa propia. Tomamos el encargo de Berti y lo llenamos de otro modo: la metaf\u00edsica que hace falta no es una teor\u00eda del Absoluto sino una f\u00edsica del acto, con la ph\u00fasis y lo divino como los dos polos.',
    ref:'Lectura propia', rel:'lectura propia', kind:'potential' },

  { id:'nuestra--phusis', source:'nuestra', target:'phusis', label:'\u1f41\u03c1\u03bc\u03ae', title:'El impulso',
    desc:'Arista deliberadamente indeterminada, la misma que abre los grafos de la \u00e9tica: la naturaleza no fija un fin \u00faltimo ni produce virtudes, pone en marcha. El rumbo se decide despu\u00e9s.',
    ref:'Lectura propia \u00b7 Phys. II.1', rel:'origen', kind:'originary' },

  { id:'nuestra--theion', source:'nuestra', target:'theion', label:'\u1f45\u03c1\u03bf\u03c2', title:'El criterio que no manda',
    desc:'Lo divino funciona como h\u00f3ros, no como paradeigma: no hay nada que copiar ni nadie que ordene. Atrae siendo comprendido, y por eso la trascendencia no se vuelve legislaci\u00f3n.',
    ref:'Lectura propia \u00b7 EE VIII.3', rel:'origen', kind:'originary' },

  { id:'nuestra--energeia2', source:'nuestra', target:'energeia_recuperata', label:'\u1f10\u03bd\u03ad\u03c1\u03b3\u03b5\u03b9\u03b1', title:'El eslab\u00f3n que falta',
    desc:'La diferencia con Berti no est\u00e1 en el diagn\u00f3stico sino en qu\u00e9 hay que recuperar primero. Nuestra respuesta es el acto: sin \u00e9l, el fin vuelve como postulado y la naturaleza como ley.',
    ref:'Lectura propia', rel:'lectura propia' },

  { id:'nuestra--dissenso', source:'nuestra', target:'dissenso', label:'dissenso', title:'D\u00f3nde discrepamos',
    desc:'Capa propia. Berti ve continuidad donde nosotros vemos sustituci\u00f3n: la ph\u00fasis y la en\u00e9rgeia no sobreviven al traslado fuera del mundo griego, ni siquiera en Tom\u00e1s o en Maritain.',
    ref:'Lectura propia', rel:'lectura propia', kind:'potential' },

];

const FIELDS = {
  phusis: { mode:'set', nodes:['phusis','energeia_recuperata','nuestra'], cls:'fphusis',
    note:'Campo resaltado: el lado del impulso y de la potencia. La ph\u00fasis pone en marcha y el acto lleva a t\u00e9rmino; recuperar la en\u00e9rgeia es recuperar esa medida. Es la l\u00ednea que la modernidad corta primero.' },
  theion: { mode:'set', nodes:['theion','nuestra'], cls:'ftheion',
    note:'Campo resaltado: el lado del acto puro y de la atracci\u00f3n. Lo divino atrae siendo comprendido, no manda: separado pero no legislador. Ocupa el lugar que en Berti tiene el bien absoluto, con otra funci\u00f3n.' }
};

const COLLAPSED = ['berti','nuestra'];


const GRAPH_INDEX = [
  { id:'grilla', label:'Grilla de autores y ejes', file:'berti-bien.html' },
  { id:'g1', label:'El bien \u00b7 mapa general', file:'grafo-berti-1.html' },
  { id:'g2', label:'Propuestas superadoras', file:'grafo-berti-2.html', parent:'g1', anchor:'superadoras' }
];

// Al cerrar las dos ramas, el puente del HTML vuelve al mapa general.
const BACK_WHEN_CLOSED = { list:['berti','nuestra'], file:'grafo-berti-1.html', concept:'superadoras' };
