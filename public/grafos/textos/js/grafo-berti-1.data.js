'use strict';
// Grafo 1 (mapa general) \u00b7 El bien \u00b7 Enrico Berti, Il bene (v2). Datos; el motor es el compartido grafos.js.
// Capas: doxografia (Berti, con paragrafo citado) y lectura propia (marcada en cada ficha).

const NODES = [

  /* ===== 1. El asunto ===== */

  { id:"bene", label:"El bien", gr:"il bene", x:0, y:0, r:56, type:"macro",
    desc:"El asunto. Berti no arranca definiendo el bien sino constatando que la palabra desapareció del vocabulario filosófico: ya Kant en 1788 escribía que la cuestión del sumo bien parecía haber caído en desuso. La pregunta, en cambio, sigue viva fuera de la filosofía. Todo el libro es el intento de volver a hacerla filosóficamente legítima.",
    ref:"Berti, Il bene §3–7" },
  { id:"problema", label:"El problema", gr:"senso della vita", x:-289, y:118, r:46, type:"condition",
    desc:"Los filósofos dejaron de hablar del bien; los jóvenes siguen preguntando para qué vale la pena vivir. Berti registra ese desajuste: a las preguntas por el qué y el cómo vuelven a sumarse las del porqué y el para qué. El problema del bien reaparece disfrazado de problema del sentido de la vida.",
    ref:"Berti §3–6" },


  /* ===== 2. Componentes de la respuesta ===== */

  { id:"componentes", label:"Componentes", gr:"de la respuesta", x:1, y:187, r:52, type:"macro",
    desc:"El bien es el fin y la perfección del hombre. Esa respuesta tiene dos caras: cómo se llega a ella y en qué consiste. El método explica por qué el libro es un recorrido histórico y no una deducción; los principios son los cuatro rasgos que Berti considera irrenunciables.",
    ref:"Berti §14–15, §24, §112" },
  { id:"metodo", label:"Método", gr:"διαλεκτική", x:90, y:340, r:44,
    desc:"Ni deducción more geometrico ni historia relativista. Se les hacen preguntas precisas a los filósofos que ya pensaron el problema y se evalúan sus respuestas en relación con la verdad buscada: el método de Aristóteles historiador, que expone las opiniones acreditadas y las discute para llegar él mismo a una solución mejor. Eso explica por qué el libro tiene forma de recorrido histórico.",
    ref:"Berti §9–11" },
  { id:"principios", label:"Principios", gr:"quattro tratti", x:-54, y:339, r:48,
    desc:"Los cuatro rasgos que componen la respuesta. No son una definición cerrada sino lo que ninguna ética puede perder: quien deja caer alguno deja de poder decir para qué vivir. Van juntos y el orden importa: el bien es una condición del hombre, esa condición es un fin, ese fin no se alcanza a solas, y remite más allá de la sociedad.",
    ref:"Berti §14–15, §24, §112" },
  { id:"essere", label:"Ser", gr:"essere, non avere", x:-226, y:465, r:44,
    desc:"El bien del hombre no está en las cosas que se poseen —riqueza, poder, honores, salud, belleza— sino en una condición del hombre mismo: ser hombre en sentido pleno, completo, realizado. Es el hallazgo socrático que Berti pone en la base de todo, y la razón por la que el bien no se mide por lo que se acumula.",
    ref:"Berti §14" },
  { id:"fine", label:"Fin", gr:"τέλος", x:-142, y:524, r:44,
    desc:"Aristóteles fija la doctrina: el bien no es otra cosa que el fin, y fin significa cumplimiento, perfección. Vale para el individuo y para la ciudad. Como los fines son muchos y unos son medios de otros, la comparación entre bienes no necesita una idea única: alcanza con la jerarquía.",
    ref:"Berti §24 · EN I.1–2" },
  { id:"comune", label:"Bien común", gr:"κοινόν", x:-39, y:526, r:46,
    desc:"La perfección lo es de veras cuando no vale sólo para uno. El bien del individuo no se realiza sin la colaboración de los demás y por eso implica el bien de los otros. Sócrates lo descubre al ligar la virtud a la ciudad, Aristóteles lo hace objeto de la política, y Berti lo cuenta entre las adquisiciones que ninguna ética puede perder.",
    ref:"Berti §15, §112" },
  { id:"assoluto", label:"Bien absoluto", gr:"bene assoluto", x:75, y:499, r:46, type:"platonic",
    desc:"El fin del hombre no se agota en el bien de la sociedad: lo trasciende. La sociedad no puede asumir ese bien como fin propio, pero debe respetarlo y hacerlo practicable. Es el punto donde la propuesta de Berti se separa tanto del inmanentismo como de una ética sin metafísica.",
    ref:"Berti §112–113" },

  /* ===== 3. Situacion problematica ===== */

  { id:"storia", label:"Situación problemática", gr:"storia del problema", x:-448, y:266, r:54, type:"macro",
    desc:"El recorrido histórico no es adorno: es el argumento. Hay un planteo que funciona, una larga serie de desvíos que lo pierden y una restauración posible. La tesis es que las razones por las que se abandonó la concepción clásica hay que tomarlas en serio, sin aceptar por eso que el abandono haya sido un progreso.",
    ref:"Berti §7, §111" },
  { id:"ok", label:"Planteo logrado", gr:"Socrate · Platone · Aristotele", x:-632, y:421, r:50, type:"bridge",
    desc:"Tres pasos y una sola cadena completa. Sócrates descubre el bien como perfección del hombre pero lo reduce a saber; Platón le da el fundamento metafísico pero lo pone en una idea unívoca; Aristóteles corrige a los dos con el fin y el acto. La diferencia decisiva no es de doctrina sino de régimen: en Aristóteles el bien no queda entendido, queda hecho.",
    ref:"Berti §14–28" },
  { id:"socrate", label:"Sócrates", gr:"ἀρετή", x:-877, y:467, r:46,
    desc:"Descubre el bien como fin y perfección del hombre, y descubre que esa perfección sólo es tal si vale para todos y para la ciudad. La felicidad es la señal de haberla alcanzado, no el objetivo. Su límite verdadero no es el eudemonismo: es que al preguntar de qué es saber el bien no sabe responder sino que es saber del bien. Círculo vicioso.",
    ref:"Berti §14–17" },
  { id:"intellettualismo", label:"Intelectualismo", gr:"virtù = sapere", x:-1098, y:569, r:58, type:"condition",
    desc:"La identificación del bien con un saber quedó casi definitiva en toda la historia de la filosofía y caracterizó al bien en sentido intelectual. Sócrates agregó que el saber no sólo es necesario sino suficiente, y ahí empieza la acusación que le hacen Platón y Aristóteles. Berti la considera fundada, sin quitarle el mérito de haber visto que sin conocimiento no hay bien humano.",
    ref:"Berti §16, §114" },
  { id:"platone", label:"Platón", gr:"ἰδέα τοῦ ἀγαθοῦ", x:-880, y:626, r:48, type:"platonic",
    desc:"Satisface la exigencia que Sócrates había dejado planteada: el saber en que consiste la perfección tiene por objeto una realidad que es causa del bien de todo lo bueno. La idea del bien es el Absoluto, pero sin personalidad: objeto de inteligencia y de amor, no sujeto. En el Filebo corrige el ascetismo —la vida buena es mixta— e introduce la mente divina.",
    ref:"Berti §19–21 · Rep. VI 505e, 509b; Fil. 22a" },
  { id:"aristotele", label:"Aristóteles", gr:"ἐνέργεια", x:-996, y:747, r:52, type:"macro",
    desc:"Retoma el descubrimiento socrático y la exigencia platónica, y corrige a los dos. Contra la idea: una característica común es unívoca y destruye la multiplicidad de bienes que la experiencia atestigua. A favor del fin: el bien es el télos, y la felicidad es el ejercicio de la función más propia del hombre. Es el único punto del recorrido donde la cadena entera se sostiene.",
    ref:"Berti §23–25 · EN I.6 1096a11–1097a14" },
  { id:"energeia", label:"Acto", gr:"δύναμις · ἐνέργεια", x:-1088, y:937, r:48,
    desc:"La diferencia con Sócrates y con Platón pasa por acá. La forma del hombre existe en potencia y tiene que ser actuada: por eso uno debe llegar a ser lo que es. El saber es condición del bien, no su sustituto —y eso deshace el intelectualismo—; el fin se realiza en la vida y no se contempla aparte —y eso deshace la idea separada—. Lo que de este acto se pierde después, y lo que habría que recuperar, se trata en el grafo de las propuestas, en el nodo Acto recuperado.",
    ref:"Berti §25 · EN I.7, X.7" },
  { id:"dio_motore", label:"Dios", gr:"κινοῦν ἀκίνητον", x:-931, y:935, r:48,
    desc:"También Aristóteles pone un bien absoluto, pero lo hace causa motriz y no causa formal: mueve siendo deseado y no da órdenes, porque no necesita nada. Por eso no destruye la multiplicidad de los bienes ni convierte la ética en deducción. El hombre se relaciona con él ejerciendo la sabiduría: contemplarlo es investigar las causas primeras.",
    ref:"Berti §26–28 · Met. XII.7; EE VIII.3" },
  { id:"aporie", label:"Aporías abiertas", gr:"ἀπορίαι", x:-813, y:868, r:46, type:"condition",
    desc:"Dos límites que Berti no disimula: la felicidad contemplativa no está al alcance de todos —no todos pueden ser filósofos— y ni el filósofo la goza eternamente, porque está la muerte. Aristóteles tampoco consigue salvar la vida del todo. De ahí que, según Berti, la solución no venga de ninguna filosofía antigua.",
    ref:"Berti §28–29" },
  { id:"sintesi", label:"Síntesis cristiana", gr:"Agostino · Tommaso", x:-669, y:629, r:48, type:"condition",
    desc:"Con Agustín y sobre todo con Tomás, dice Berti, la búsqueda de una solución positiva llega a su punto más alto: la beatitud responde a lo que Aristóteles dejaba abierto. Lectura propia: lo que vuelve es el fin, no el acto. La naturaleza y la obra reaparecen subordinadas al esse y a la visión, y en ese desplazamiento empieza lo que después se pierde del todo.",
    ref:"Berti §35–40 · comentario: lectura propia" },
  { id:"derive", label:"Desvíos históricos", gr:"la crisi", x:-417, y:456, r:50, type:"macro",
    desc:"Desde la decadencia de la escolástica en adelante, cada intento de rehacer la ética pierde algo del planteo clásico y ninguno recupera lo perdido. Berti los ordena en dos tramos: la crisis de la solución clásica y los nuevos intentos fracasados. Lo común a todos es no conocer más metafísica que la matemática ni más física que la mecánica.",
    ref:"Berti §43–98" },
  { id:"meccanicismo", label:"Mecanicismo", gr:"natura senza fini", x:-536, y:689, r:48, type:"condition",
    desc:"Descartes quita los fines de la naturaleza; Spinoza identifica naturaleza y Dios y reduce el bien y el mal a hechos puramente cognoscitivos, de tipo matemático; Leibniz reacciona contra el inmanentismo pero conserva el mismo orden matemático. Sin phúsis teleológica el bien se queda sin dónde medirse.",
    ref:"Berti §43–51" },
  { id:"humekant", label:"Ser y deber", gr:"is · ought", x:-433, y:691, r:46, type:"condition",
    desc:"Hume mantiene que la filosofía moral debe hacer mejores a los hombres, pero niega el paso de lo descriptivo a lo prescriptivo porque no conoce otra metafísica que la matemática ni otra física que la mecanicista. Kant lo sigue exactamente en eso: la norma no puede derivar de un conocimiento del hombre, y la ética se vuelve formal.",
    ref:"Berti §53–63" },
  { id:"immanenza", label:"Inmanencia", gr:"eticità · storia", x:-260, y:623, r:46, type:"condition",
    desc:"Hegel objeta con razón la indeterminación del deber kantiano, pero pone el bien en la eticidad y termina en el Espíritu absoluto, donde el individuo queda por debajo de la historia. Marx traduce eso en trabajo y sociedad sin clases, y tropieza con la muerte, que su solución no puede asumir.",
    ref:"Berti §68–77" },
  { id:"rinuncia", label:"Renuncia", gr:"trasvalutazione", x:-330, y:700, r:46, type:"condition",
    desc:"Nietzsche declara que, a falta de fundamento, no hay bien que valga, y lo reemplaza por la moral de los señores. Moore prohíbe definirlo con la falacia naturalista y lo deja indefinible e intuible. Scheler y Hartmann lo entregan a una intuición emocional. Sartre, a la elección sin criterio. Es el fondo de la parábola descendente.",
    ref:"Berti §79–98" },

  /* ===== 4. Propuestas superadoras (se despliegan en el grafo 2) ===== */

  { id:"superadoras", label:"Propuestas superadoras", gr:"due uscite", x:286, y:155, r:52, type:"macro",
    desc:"Berti no cierra el libro con el diagnóstico: propone una salida, y nosotros proponemos otra. Las dos aceptan que la concepción clásica se perdió y que no alcanza con volver atrás; discrepan en qué hay que recuperar primero. Están puestas en el mismo lugar para que se comparen. Agruparlas así es decisión nuestra, no de Berti.",
    ref:"Berti §111–115 · Lectura propia" },
  { id:"berti", label:"Berti", gr:"non un ritorno", x:426, y:332, r:48, type:"macro", subs:[{"file":"grafo-berti-2.html","concept":"berti","label":"las dos propuestas"}],
    desc:"No propone volver atrás: un retorno que no se haga cargo de la distancia histórica sería inactual y poco convincente. Propone retener tres adquisiciones, anclar la ética a una metafísica y aprovechar la rehabilitación de la filosofía práctica. Lo que queda por hacer es construir esa metafísica nueva. El signo con la flecha hacia adentro abre el grafo de las propuestas con esta rama desplegada.",
    ref:"Berti §111–115" },
  { id:"nuestra", label:"Nuestra idea", gr:"realismo naturalista", x:267, y:351, r:48, type:"bridge", subs:[{"file":"grafo-berti-2.html","concept":"nuestra","label":"las dos propuestas"}],
    desc:"Aceptamos el diagnóstico y el anclaje metafísico; discrepamos en el contenido. Lo primero que hay que recuperar no es el fin sino el acto. La phúsis pone el impulso y mide la obra; lo divino atrae sin mandar. La fórmula es separado pero no legislador: hay trascendencia y no hay legislación. El signo con la flecha hacia adentro abre el grafo de las propuestas con esta rama desplegada.",
    ref:"Lectura propia" }

];

const EDGES = [

  { id:'bene--problema', source:'bene', target:'problema', label:'senso', title:'El problema que queda',
    desc:'El bien sali\u00f3 del vocabulario de los fil\u00f3sofos y volvi\u00f3 por otro lado, como pregunta por el sentido de la vida. La arista marca ese desplazamiento: no cambi\u00f3 el problema, cambi\u00f3 qui\u00e9n lo formula.',
    ref:'Berti \u00a73\u20136', rel:'planteo' },

  { id:'problema--storia', source:'problema', target:'storia', label:'\u1f31\u03c3\u03c4\u03bf\u03c1\u03af\u03b1', title:'El problema como historia',
    desc:'La historia del problema no ilustra la tesis: la prueba. Mostrar qu\u00e9 se perdi\u00f3 y por qu\u00e9 es el modo de mostrar qu\u00e9 hace falta.',
    ref:'Berti \u00a77, \u00a7111', rel:'estructura' },

  { id:'bene--componentes', source:'bene', target:'componentes', label:'risposta', title:'Qu\u00e9 es el bien',
    desc:'La respuesta que Berti sostiene a lo largo de todo el libro, aunque la formule reci\u00e9n en la conclusi\u00f3n: el bien es el fin y la perfecci\u00f3n del hombre.',
    ref:'Berti \u00a714, \u00a724, \u00a7112', rel:'tesis' },

  { id:'bene--superadoras', source:'bene', target:'superadoras', label:'oltre', title:'Las dos salidas',
    desc:'Del mismo asunto salen las dos propuestas que intentan superar la situaci\u00f3n: la de Berti y la nuestra. No son una etapa m\u00e1s de la historia sino respuestas a ella, y por eso cuelgan del bien y no de la situaci\u00f3n problem\u00e1tica.',
    ref:'Berti \u00a7111\u2013115 \u00b7 Lectura propia' },

  { id:'componentes--metodo', source:'componentes', target:'metodo', label:'\u03b4\u03b9\u03ac\u03bb\u03bf\u03b3\u03bf\u03c2', title:'C\u00f3mo se lo trata',
    desc:'La decisi\u00f3n de m\u00e9todo es previa a toda tesis y condiciona el libro entero: se pregunta a los que ya pensaron el problema. De ah\u00ed que la respuesta de Berti llegue al final de un recorrido y no al principio.',
    ref:'Berti \u00a79\u201311', rel:'m\u00e9todo' },

  { id:'componentes--principios', source:'componentes', target:'principios', label:'\u1f00\u03c1\u03c7\u03b1\u03af', title:'En que consiste',
    desc:'La otra cara de la respuesta: no c\u00f3mo se la busca sino qu\u00e9 dice. Los cuatro principios se sostienen entre s\u00ed y Berti los presenta como el saldo irrenunciable de toda la tradici\u00f3n.',
    ref:'Berti \u00a714\u201315, \u00a724, \u00a7112' },

  { id:'principios--essere', source:'principios', target:'essere', label:'\u03c8\u03c5\u03c7\u03ae', title:'Una condici\u00f3n, no una posesi\u00f3n',
    desc:'El primer rasgo. El bien est\u00e1 en el alma, es decir en lo que el hombre es, no en los bienes exteriores ni en los del cuerpo.',
    ref:'Berti \u00a714', rel:'rasgo' },

  { id:'principios--fine', source:'principios', target:'fine', label:'\u03c4\u03ad\u03bb\u03bf\u03c2', title:'El bien es el fin',
    desc:'Segundo rasgo, y el m\u00e1s t\u00e9cnico: identificar el bien con el fin permite comparar bienes diversos sin postular una idea \u00fanica.',
    ref:'Berti \u00a724', rel:'rasgo' },

  { id:'principios--comune', source:'principios', target:'comune', label:'\u03ba\u03bf\u03b9\u03bd\u03cc\u03bd', title:'No se realiza solo',
    desc:'Tercer rasgo. La perfecci\u00f3n del individuo exige la colaboraci\u00f3n de los otros, de modo que el bien com\u00fan no es un agregado pol\u00edtico sino parte de la definici\u00f3n.',
    ref:'Berti \u00a715, \u00a7112', rel:'rasgo' },

  { id:'principios--assoluto', source:'principios', target:'assoluto', label:'\u1f00\u03c1\u03c7\u03ae', title:'Remite a un absoluto',
    desc:'Cuarto rasgo. El fin del hombre excede a la sociedad; sin esa referencia la \u00e9tica queda sin fundamento y con ella vuelve el problema de qu\u00e9 tipo de metaf\u00edsica es admisible.',
    ref:'Berti \u00a7112\u2013113', rel:'rasgo' },

  { id:'storia--ok', source:'storia', target:'ok', label:'soluzione', title:'La soluci\u00f3n antigua',
    desc:'El tramo en que el problema queda bien planteado y casi resuelto. Berti lo recorre en tres pasos y no lo presenta como una edad de oro: tambi\u00e9n ah\u00ed quedan apor\u00edas.',
    ref:'Berti \u00a714\u201329', rel:'tramo' },

  { id:'storia--derive', source:'storia', target:'derive', label:'decadenza', title:'La p\u00e9rdida',
    desc:'El tramo largo: crisis de la soluci\u00f3n cl\u00e1sica y nuevos intentos fallidos. Ordenado no por escuelas sino por lo que cada uno deja de poder decir.',
    ref:'Berti \u00a743\u201398', rel:'tramo' },

  { id:'ok--socrate', source:'ok', target:'socrate', label:'\u1f00\u03c1\u03b5\u03c4\u03ae', title:'El descubrimiento',
    desc:'El concepto de bien como fin y perfecci\u00f3n del hombre es un descubrimiento datado, y Berti se lo atribuye sin reservas a S\u00f3crates.',
    ref:'Berti \u00a714', rel:'origen' },

  { id:'socrate--intell', source:'socrate', target:'intellettualismo', label:'sapere', title:'El bien como saber',
    desc:'La segunda gran tesis socr\u00e1tica, y la que marc\u00f3 toda la historia posterior: el bien consiste en un saber, y el saber basta.',
    ref:'Berti \u00a716', rel:'tesis' },

  { id:'socrate--platone', source:'socrate', target:'platone', label:'\u1f30\u03b4\u03ad\u03b1', title:'La exigencia metaf\u00edsica',
    desc:'S\u00f3crates deja planteado que el hombre no se basta y necesita un criterio superior a \u00e9l. Plat\u00f3n es el primero en tratar de satisfacer esa exigencia, y lo hace con la idea del bien.',
    ref:'Berti \u00a717, \u00a719', rel:'continuidad' },

  { id:'platone--aristotele', source:'platone', target:'aristotele', label:'\u1f14\u03bb\u03b5\u03b3\u03c7\u03bf\u03c2', title:'Contra la univocidad',
    desc:'La cr\u00edtica es precisa: una idea es una caracter\u00edstica com\u00fan, por lo tanto un\u00edvoca, y una causa un\u00edvoca destruye la multiplicidad de bienes que la experiencia atestigua. Lo que el disc\u00edpulo hace valer contra el maestro son los derechos de la experiencia.',
    ref:'Berti \u00a723 \u00b7 EN I.6', rel:'cr\u00edtica' },

  { id:'intell--aristotele', source:'intellettualismo', target:'aristotele', label:'\u1f10\u03bd\u03ad\u03c1\u03b3\u03b5\u03b9\u03b1', title:'Contra el intelectualismo',
    desc:'La otra correcci\u00f3n, y la que m\u00e1s nos importa: el saber es necesario pero no suficiente, porque la forma del hombre existe en potencia y hay que actuarla. La en\u00e9rgeia es exactamente lo que le falta al bien socr\u00e1tico y lo que sobra en la idea plat\u00f3nica.',
    ref:'Berti \u00a716, \u00a725, \u00a7114', rel:'cr\u00edtica' },

  { id:'aristotele--energeia', source:'aristotele', target:'energeia', label:'\u03b4\u03cd\u03bd\u03b1\u03bc\u03b9\u03c2', title:'Hay que llegar a ser lo que se es',
    desc:'La doctrina que hace posible todo el planteo: la naturaleza del hombre existe en potencia y debe traducirse en acto. Sin esa distinci\u00f3n, decir que uno debe llegar a ser lo que es ser\u00eda una paradoja vac\u00eda.',
    ref:'Berti \u00a725', rel:'fundamento' },

  { id:'aristotele--dio', source:'aristotele', target:'dio_motore', label:'\u03ba\u03b9\u03bd\u03bf\u1fe6\u03bd', title:'Causa motriz, no formal',
    desc:'El absoluto vuelve, pero con otro tipo de causalidad. Mueve como fin deseado y no como esencia com\u00fan, y por eso la \u00e9tica no se deduce de la metaf\u00edsica: indica un fin y los medios para alcanzarlo.',
    ref:'Berti \u00a726\u201328 \u00b7 Met. XII.7', rel:'fundamento' },

  { id:'aristotele--aporie', source:'aristotele', target:'aporie', label:'\u1f00\u03c0\u03bf\u03c1\u03af\u03b1', title:'Lo que queda sin resolver',
    desc:'La felicidad contemplativa no es para todos y no dura: dos l\u00edmites internos que no rompen la cadena pero dejan abierta la pregunta por la salvaci\u00f3n de la vida.',
    ref:'Berti \u00a728', rel:'l\u00edmite' },

  { id:'aporie--sintesi', source:'aporie', target:'sintesi', label:'fides', title:'La respuesta cristiana',
    desc:'Para Berti la soluci\u00f3n de esas apor\u00edas no viene de ninguna filosof\u00eda antigua sino de una religi\u00f3n. Punteada porque el paso no es filos\u00f3fico: cambia el tipo de fundamento.',
    ref:'Berti \u00a729, \u00a735\u201340', rel:'paso hist\u00f3rico', kind:'potential' },

  { id:'sintesi--derive', source:'sintesi', target:'derive', label:'crisi', title:'Lo que entra en crisis',
    desc:'Lo que la modernidad abandona no es el planteo aristot\u00e9lico sino la s\u00edntesis escol\u00e1stica: con la decadencia de la escol\u00e1stica y el nacimiento de la ciencia moderna cae el edificio entero, y con \u00e9l la naturaleza con fines.',
    ref:'Berti \u00a743', rel:'paso hist\u00f3rico' },

  { id:'derive--mecc', source:'derive', target:'meccanicismo', label:'machina', title:'Primera p\u00e9rdida: la naturaleza',
    desc:'Sin causas finales en la f\u00edsica no hay obra propia de nada, y el bien se queda sin medida natural. Es la p\u00e9rdida que hace posibles todas las siguientes.',
    ref:'Berti \u00a743\u201351', rel:'p\u00e9rdida' },

  { id:'derive--hume', source:'derive', target:'humekant', label:'dovere', title:'Segunda p\u00e9rdida: el paso al deber',
    desc:'Hume corta el paso del ser al deber y Kant lo confirma desde el otro lado. El bien deja de conocerse y pasa a mandarse.',
    ref:'Berti \u00a753\u201363', rel:'p\u00e9rdida' },

  { id:'derive--imman', source:'derive', target:'immanenza', label:'storia', title:'Tercera p\u00e9rdida: el individuo',
    desc:'Hegel y Marx devuelven contenido al bien pero lo ponen en la historia o en la sociedad, y el individuo queda sin fin propio. Los dos tropiezan con la muerte.',
    ref:'Berti \u00a768\u201377', rel:'p\u00e9rdida' },

  { id:'derive--rinuncia', source:'derive', target:'rinuncia', label:'nihil', title:'Cuarta p\u00e9rdida: el concepto',
    desc:'Nietzsche, Moore, Scheler, Hartmann y Sartre ya no discuten qu\u00e9 es el bien: discuten si se puede decir algo de \u00e9l. Es el fondo de la par\u00e1bola.',
    ref:'Berti \u00a779\u201398', rel:'p\u00e9rdida' },

  { id:'superadoras--berti', source:'superadoras', target:'berti', label:'proposta', title:'La salida de Berti',
    desc:'Retener las tres adquisiciones, anclar la \u00e9tica a una metaf\u00edsica y aprovechar la rehabilitaci\u00f3n de la filosof\u00eda pr\u00e1ctica. Lo que queda por hacer es construir esa metaf\u00edsica nueva.',
    ref:'Berti \u00a7111\u2013115' },

  { id:'superadoras--nuestra', source:'superadoras', target:'nuestra', label:'nostra', title:'Nuestra salida',
    desc:'Capa propia. Aceptamos el diagn\u00f3stico y el anclaje metaf\u00edsico, pero cambiamos el orden: lo primero que hay que recuperar es el acto, no el fin. Es punteada porque no pertenece al libro.',
    ref:'Lectura propia', rel:'lectura propia', kind:'potential' },

];

const FIELDS = {};

const COLLAPSED = ['storia','ok','derive','principios'];


const GRAPH_INDEX = [
  { id:'grilla', label:'Grilla de autores y ejes', file:'berti-bien.html' },
  { id:'g1', label:'El bien \u00b7 mapa general', file:'grafo-berti-1.html' },
  { id:'g2', label:'Propuestas superadoras', file:'grafo-berti-2.html', parent:'g1', anchor:'superadoras' }
];
