/* ==================== CORPUS DE BERTI (externo) ====================
   El texto vive en ./data/berti-il-bene.json y se carga por fetch.
   Requiere servidor http (no funciona abriendo el archivo con file:///). */
let BERTI = {};
const BERTI_READY = fetch('./data/berti-il-bene.json')
  .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
  .then(j => { BERTI = j; return j; })
  .catch(e => { console.error('[grafo-bien] no pude cargar el corpus de Berti:', e); return {}; });

/* ==================== DATOS ==================== */

const CHAIN = [
  { id:'phusis',     g:'phusis',          es:'naturaleza' },
  { id:'logos',      g:'logos',           es:'razón y discurso' },
  { id:'ergon',      g:'ergon · energeia', es:'obra / estar-en-obra' },
  { id:'arete',      g:'areté',           es:'excelencia' },
  { id:'eudaimonia', g:'eudaimonía',      es:'vida lograda' },
  { id:'koinonia',   g:'koinonía',        es:'comunidad · polis' }
];
const COND = {
  ergon: { label:'si es excelente', kind:'hexis', id:'hexis' },
  arete: { label:'si es completa', kind:'aux', id:'bios' }
};
const SYM = { conserva:'●', desplaza:'◆', rompe:'×', suprime:'∅' };
const LBL = { conserva:'conserva', desplaza:'desplaza', rompe:'rompe', suprime:'suprime' };

const CONCEPTS = {
  phusis: {
    g:'phúsis', es:'naturaleza', n:1,
    lede:'Principio interno de movimiento y de reposo. No el conjunto de las cosas, sino aquello que cada cosa tiene en sí y que la hace tender a lo que es.',
    facets:[
      ['Naturaleza como principio','La phúsis es un principio y una causa de movimiento y de reposo en aquello a lo que pertenece primariamente, por sí y no por accidente. No es algo añadido: es interno.'],
      ['Naturaleza como fin','La phúsis es más forma que materia: cada cosa se llama por lo que es en acto, no por lo que es en potencia. Y aquello hacia lo que algo crece es su naturaleza.'],
      ['Hay fin en la naturaleza','La naturaleza obra por algo aunque no delibere: no es menos fin el que no razona. Es el punto exacto que la ciencia moderna declara ilegible y luego vuelve a describir con otros nombres.']
    ],
    why:'Es el primer eslabón porque si la naturaleza no tiene fines no hay nada que el bien pueda perfeccionar. La ética queda entonces sin suelo, y hay que inventarle uno: un mandato (Kant), un sentimiento (Hume), una intuición (Moore), una historia (Hegel), una decisión (Sartre). Ahí rompe la modernidad entera.',
    own:'Realismo naturalista. La phúsis no es un objeto religioso ni una legalidad mecánica: es el dinamismo que la biología del desarrollo, la etología y la ecología vuelven a describir hoy sin llamarlo así. Recuperar la phúsis no exige creer nada: exige dejar de prohibir la pregunta por el fin.',
    pillars:'Este eslabón es el primero de los dos pilares del planteo. La phúsis es el origen: <b>impulsa</b> hacia la areté de manera formal y potencial, y lo hace igual para todos los individuos de la especie que comparten la forma. <span class="gr">To theîon</span> es el otro pilar: el término, la realización sin resto, que <b>atrae</b> desde afuera y de manera desigual, según la areté que cada uno ya alcanzó. Potencia de un lado, acto puro del otro, y en medio el camino. La forma específica puede variar en el tiempo evolutivo, pero es siempre la misma para los individuos de la especie: lo que cambian las épocas y la técnica son las condiciones de realización, no el érgon.',
    loci:['Fís. II.1 192b13-15','Fís. II.1 193a30-b18','Fís. II.8','Met. Θ 8 1050a15-16']
  },
  logos: {
    g:'lógos', es:'razón y discurso', n:2,
    lede:'Razón y palabra a la vez. Es la diferencia específica del hombre, y hace tres cosas distintas que la modernidad separó y repartió entre disciplinas que ya no se hablan.',
    facets:[
      ['Determina el ergon del hombre','Si el ojo, la mano y el pie tienen su obra propia, también el hombre la tiene: cierta vida, y esa vida es actividad del alma según logos. El logos no es un adorno de la naturaleza humana: es lo que fija cuál es su obra.'],
      ['Razón práctica: el bien se conoce, no se manda','Deliberación y phrónesis: disposición verdadera acompañada de razón para obrar respecto de lo bueno y lo malo para el hombre. Se delibera sobre lo que está en nuestro poder y admite ser de otra manera.'],
      ['Discurso compartido: funda la polis','La voz basta para señalar el placer y el dolor, y la tienen los demás animales; el logos sirve para manifestar lo conveniente y lo dañoso, lo justo y lo injusto. La comunidad de estas cosas hace la casa y la ciudad.'],
      ['Con la precisión que el asunto admite','No hay que buscar la misma akríbeia en todos los razonamientos: es propio del hombre instruido buscar en cada género la exactitud que su naturaleza permite. El logos práctico no es menos riguroso: es riguroso de otro modo.']
    ],
    why:'Este eslabón repara un hueco de la versión anterior. Sin él no se distingue entre conocer el bien y mandarlo, y quedan sin lugar los autores cuya ruptura es exactamente ésa: Sócrates (el bien es saber, y sólo saber), Kant (manda un bien que declara incognoscible), Moore (indefinible, sólo intuible), Hume y Scheler (sentimiento, intuición emocional), Nietzsche (renuncia deliberada a justificar). Cinco rupturas que antes no se veían.',
    own:'El logos es también la bisagra del método: dialéctica, endoxa, aporías. Una ética que se funda en el logos no necesita certeza deductiva; necesita razones que puedan discutirse. Eso es lo que la vuelve compatible con la ciencia y no con la revelación.',
    loci:['EN I.7 1097b24-1098a18','EN I.3 1094b12-27','EN VI.4-5 1140a1-b7','Pol. I.2 1253a9-18']
  },
  ergon: {
    g:'érgon · enérgeia', es:'obra / estar-en-obra', n:3,
    lede:'Un solo eslabón con dos palabras. No porque signifiquen lo mismo, sino porque comparten marco semántico: érgon está dentro de en-érg-eia. Sin este eslabón el bien no tiene dónde realizarse, y es el único que ningún autor moderno recupera con fundamento.',
    facets:[
      ['Érgon, sentido 1: obra o producto','Lo que queda hecho y se separa del hacer: la casa respecto de construir. Aquí la obra es mejor que la actividad que la produce.'],
      ['Érgon, sentido 2: función o tarea propia','El ergon del ojo es ver, el del cuchillo cortar, el del citarista tocar. Es el uso constitutivo: lo que define qué es algo, no para qué sirve accidentalmente.'],
      ['Érgon, sentido 3: la actividad misma','Cuando no hay obra separada del obrar, la energeia es la obra: ver, pensar, vivir bien. Ahí obra y actividad coinciden, y es justamente el caso del hombre.'],
      ['Enérgeia: estar-en-obra','Se opone a dýnamis. El que posee la ciencia y no la ejerce la tiene en potencia; el que la ejerce está en acto. El nombre mismo lo declara: energeia, de érgon. Y la energeia es el fin, no un medio hacia el fin.'],
      ['Enérgeia en filosofía práctica: el bien no se sabe, se lleva a término','Aquí el concepto deja de describir y empieza a exigir. El fin de esta investigación no es el conocimiento sino la acción (EN I.3 1095a5-6); no investigamos qué es la virtud para saberlo, sino para hacernos buenos (EN II.2 1103b26-29). Entre entender el concepto y ser virtuoso hay exactamente la distancia que va de la potencia al acto, y no la salva más lógos: la salva el acto. Aristóteles lo dice con una imagen clínica: los que se refugian en el discurso creen filosofar y así hacerse buenos, y se parecen a los enfermos que escuchan con atención al médico y no hacen nada de lo que les manda (EN II.4 1105b9-18). Por eso la asimetría entre saber y ser no es un defecto del alumno: es la estructura misma del bien práctico, que no existe hasta que está en obra.','sólo en Aristóteles'],
    ],
    why:'La unificación es deliberada: donde la obra se separa del obrar (construir/casa) ergon es el producto; donde no se separa (ver, pensar, vivir bien) la obra es la actividad misma. La ética del hombre cae del segundo lado: la eudaimonía es energeia, no producto. Por eso unificar ergon con logos sería un error —el logos determina cuál es el ergon, no es el ergon— y unificar ergon con energeia es sólo reconocer un marco semántico que el griego ya tenía.',
    warn:'Homonimia moderna: «energía» en sentido físico es una magnitud cuantitativa acuñada en el siglo XIX. No tiene nada que ver. Traducir energeia por «energía» es el caso más claro de la deriva semántica que esta app quiere volver visible.',
    vocab:'De qué verbo usar. «Crear» no sirve: no hay creación en Aristóteles, y el verbo pertenece a la téchne —poieîn, producir algo que queda separado del agente (érgon en su sentido 1)—. En la praxis no se produce un objeto: se lleva a término una naturaleza. El vocabulario correcto es el de la phúsis. Aristóteles dice que las virtudes no nacen en nosotros ni por naturaleza ni contra naturaleza: estamos naturalmente dispuestos a recibirlas y nos perfeccionamos por el hábito —engínontai, teleiouménois, EN II.1 1103a23-26—, y en el libro I el cuidado (epiméleia) es lo que la política pone en hacer a los ciudadanos de cierta clase y buenos (EN I.9 1099b29-32). De ahí la escala que conviene usar: engendrar y hacer brotar para el comienzo, cultivar para el trabajo del hábito, madurar y llevar a término para la consumación. Florecer queda reservado a la eudaimonía, que es el resultado y no el acto. Producir, fabricar y crear, sólo para la téchne.',
    own:'Es el eslabón que la modernidad pierde entero. Y es también el que los restauradores del siglo XIX y XX no recuperan: Rosmini restaura el finalismo, Maritain el bien común, ninguno de los dos el estar-en-obra. Ahí está nuestro hueco y nuestra apuesta.',
    loci:['Met. Θ 6 1048b18-35','Met. Θ 8 1050a21-23','EN I.7 1097b24-1098a18','EN I.8 1098b31-1099a7','EN I.3 1095a5-6','EN II.2 1103b26-29','EN II.4 1105b9-18','EN X.9 1179a33-b4','Pol. I.1']
  },
  arete: {
    g:'areté', es:'excelencia', n:4,
    lede:'Excelencia: la disposición que hace buena a una cosa y hace buena su obra. No es un valor añadido a la actividad: es la cualidad de una actividad bien hecha.',
    facets:[
      ['Definición canónica','La virtud del hombre será la hexis por la cual el hombre se hace bueno y por la cual realiza bien su propia obra. Las dos cosas juntas: el agente y el acto.'],
      ['No es una medida abstracta','El término medio no es el de la cosa sino el relativo a nosotros, y lo determina el phrónimos. No hay tabla de virtudes aplicable sin juicio.'],
      ['Ni natural ni contra natura','Por naturaleza podemos recibirlas, y se perfeccionan por el hábito. La naturaleza da la capacidad; el ejercicio, la disposición.']
    ],
    cond:'Condición de entrada: energeia → areté sólo si la actividad es excelente. Hay energeiai que no tienen nada de virtuosas —el hábil delinque con destreza, el cruel es constante—. Por eso la cadena no pasa automáticamente del obrar al bien obrar: ese paso es la areté, y lo que lo explica es la hexis.',
    own:'Aquí entra también lo divino, y por la única vía que Aristóteles autoriza: el deseo de excelencia. No un mandato que desciende, sino una atracción que tira desde arriba. Ver la capa «La nueva metafísica».',
    loci:['EN II.6 1106a15-24','EN II.1 1103a14-26','EN II.5 1105b19-1106a13','EN II.6 1106a36-1107a2']
  },
  eudaimonia: {
    g:'eudaimonía', es:'vida lograda', n:5,
    lede:'Vida lograda, no estado de ánimo. La traducción por «felicidad» es la segunda gran pérdida después de la de energeia: convierte una actividad en un sentimiento.',
    facets:[
      ['Es actividad, no posesión','El bien humano resulta ser actividad del alma según la virtud, y si las virtudes son varias, según la mejor y más completa. No basta tener la disposición: en los Juegos no se coronan los más fuertes, sino los que compiten.'],
      ['Es fin último, no un bien más','Es aquello que se elige siempre por sí mismo y nunca por otra cosa. Ni placer, ni honor, ni riqueza: todos ésos se eligen también por otra cosa.'],
      ['Necesita tiempo y condiciones','En una vida completa: una golondrina no hace primavera, ni un solo día. Y necesita bienes exteriores, lo que la vuelve vulnerable —y la hace política.'],
      ['No es la Idea de bien','Aunque hubiera un bien separado y subsistente, no sería realizable ni alcanzable por el hombre; y el bien que buscamos es uno alcanzable. Aristóteles corta aquí con Platón, y de paso con toda metafísica del absoluto normativo.']
    ],
    cond:'Condición de entrada: areté → eudaimonía si es completa y dura. La eudaimonía exige virtud total en una vida entera; una virtud aislada cumple la condición sólo en parte. De ahí que la flecha no sea una implicación sino un cumplimiento gradual.',
    loci:['EN I.7 1098a16-18','EN I.2 1094a18-22','EN I.5 1095b31-1096a2','EN I.6 1096a11-1097a14','EN I.8 1098b31-1099a7']
  },
  koinonia: {
    g:'koinonía · polis', es:'comunidad', n:6,
    lede:'El bien humano es de suyo común. No la suma de bienes privados ni un bien colectivo superior a las personas: la forma en que un bien humano existe.',
    facets:[
      ['Toda comunidad se constituye por un bien','Y la que las abarca a todas y es la más soberana es la polis. La comunidad no es un medio para bienes previos: es donde el bien tiene lugar.'],
      ['El hombre es político porque tiene logos','El eslabón 6 se enlaza con el 2: es el mismo logos que determina el ergon el que funda la comunidad. Por eso la cadena se cierra sobre sí misma y no termina en el individuo.'],
      ['Mayor y más perfecto','Es amable procurar el bien de uno solo, pero más bello y más divino el de un pueblo y el de las ciudades. La ética es un capítulo de la política, no al revés.'],
      ['La ley forma el hábito','La mayoría obedece más a la necesidad que a la razón, y a los castigos más que a lo noble: por eso hacen falta leyes y costumbres. La comunidad es la condición material de la areté.']
    ],
    why:'Cierra la cadena y la reabre: la eudaimonía necesita una comunidad que la haga posible, y la comunidad busca esa eudaimonía. No es circularidad viciosa: es la estructura de un bien que sólo existe realizándose en común.',
    loci:['Pol. I.1 1252a1-7','Pol. I.2 1253a9-18','EN I.2 1094b7-10','EN X.9 1179a33-b4']
  }
};

const HEXIS = {
  g:'héxis', es:'disposición estable',
  lede:'Disposición estable adquirida por el ejercicio. Ni pasión ni facultad: un modo de estar dispuesto, que se tiene y que se puede no ejercer.',
  why:'No es un eslabón de la cadena: va enganchada a la flecha que lleva de energeia a areté, y es lo que explica su etiqueta «si es excelente». Explica el paso sin confundir los dos términos, y resuelve la objeción del virtuoso dormido.',
  facets:[
    ['La areté es una hexis —y esto hay que decirlo con cuidado','La virtud se define como hexis prohairetiké: disposición electiva en el término medio relativo a nosotros, determinado por la razón. La hexis es el género próximo de la virtud, no su contrario. Lo correcto no es decir que la hexis no es virtud, sino que la disposición no es todavía realización.'],
    ['Pero la disposición no basta','El que duerme, o el inactivo de por vida, tiene la disposición y no hace nada bueno. Por eso el bien no se pone en la hexis sino en la energeia: en los Juegos no se coronan los más fuertes sino los que compiten.'],
    ['Se adquiere ejercitándola','Haciendo actos justos nos hacemos justos. El círculo no es vicioso: los primeros actos justos son distintos de los del justo ya formado —se hacen sin la disposición que producirán—.']
  ],
  key:'Toda areté es hexis, pero no toda hexis es areté, y no toda energeia es excelente. La cadena pasa por energeia porque el bien está en el obrar; pasa a areté porque no cualquier obrar cuenta. La hexis es lo que hay en medio y por eso va como ficha de arista, no como eslabón.',
  loci:['EN II.5 1105b19-1106a13','EN II.6 1106a36-1107a2','EN II.1 1103a14-26','EN I.8 1098b31-1099a7']
};

const AUX = {
theion: {
  eyebrow:'Ficha auxiliar · el segundo pilar',
  g:'to theîon', es:'lo divino · atrae, no ordena',
  lede:'Los dos pilares de todo el planteo son la phúsis y to theîon. La phúsis es el origen y la potencia; to theîon es el término y la realización sin resto. El bien humano se realiza en la tensión entre los dos, y esa relación no está fijada de antemano: se rehace en cada vida y en cada época.',
  whyT:'Para qué hace falta el segundo polo',
  why:'No es un eslabón de la cadena: es el polo que la tensa desde afuera. Sin él la realización de la forma específica tendría techo —una vez realizada, no quedaría nada que buscar— y la ética se volvería complacencia. Con él el bien tiene medida sin tener término: la phúsis fija qué hay que realizar, y to theîon impide que eso pueda declararse completo.',
  sec:'Cómo funciona la relación',
  facets:[
    ['La phúsis impulsa; to theîon atrae','La phúsis es principio interno de movimiento y reposo: formal, potencial y el mismo para todos los individuos de la especie. Por eso el bien tiene medida y puede empezar sin mérito previo. To theîon, en cambio, es sustancia separada y acto puro: no empuja desde dentro, atrae desde el término. Uno reparte igual para todos; el otro, no.'],
    ['Atrae siendo comprendido','Mueve como objeto de deseo y de pensamiento —orektón y noetón—, es decir, mueve sin moverse él: todo el trabajo lo hace el que comprende. Cuanto mayor es la areté ya alcanzada, mayor la comprensión del orden natural y de lo divino, mayor la atracción y más comprometidas las pasiones en ella. De ahí que la atracción sea una causa tardía: los primeros pasos los dan la phúsis, el hábito y la ley, porque a los más el lógos solo no los hace buenos.'],
    ['Lo singular está del lado del atraído','To theîon es indiferente: se piensa a sí mismo y no conoce ni elige a nadie. La desigualdad de la atracción no viene de él sino de cada ousía, que responde según su grado de acto, su materia y su historia. Singular es el camino; común es aquello hacia lo que se va, y los bienes más altos son justamente los que aumentan su bondad al compartirse. El lugar donde las dos cosas coinciden es la philía.'],
    ['Excelencia absoluta, y sin héxis','Areté no significa aquí virtud del alma humana sino excelencia sin más: la de cualquier cosa que tenga una obra propia. La de to theîon es absoluta, total y perfecta, y Aristóteles llega a nombrarla —areté divina, el término superlativo por encima de la humana—. Pero no es una héxis: una héxis es disposición que puede estar o no en obra, y donde no hay potencia no hay nada que disponer.'],
    ['Mide el contenido; da ejemplo del modo','No dice qué hacer: no delibera, no elige, no tiene pasiones ni situación, y por eso su excelencia no tiene contenido transferible a la praxis. Lo que hace es medir cuánto falta: es el hóros, el criterio —aquella elección y posesión de bienes naturales que más favorezca la contemplación de lo divino— y expresamente no da órdenes. En cuanto al modo, en cambio, sí es ejemplar: hay asimilación, inmortalizar en cuanto es posible, y el modo de vida de lo divino es como el mejor que nosotros tenemos por poco tiempo. Ejemplo de estar-en-obra, no de conducta.'],
    ['No se realiza: se participa','El bien divino no es un tercer peldaño de la escalera práctica sino un eje que la atraviesa entera. No se produce ni se conquista: se participa de él, por la contemplación y por lo que de nosotros dura —todo viviente engendra para participar de lo eterno y lo divino en la medida en que puede—. Por eso el bien de la ciudad es más bello y más divino que el de uno solo: alcanza a más y dura más.']
  ],
  ownT:'El principio de la areté',
  own:'Consiste en buscar realizar bienes siempre mayores. <b>Primero los singulares</b>: virtudes éticas y dianoéticas, y la felicidad —virtud total, bienes externos, buena fortuna y vida completa—. <b>Después los comunes</b>: la koinonía teleía, la comunidad completa que existe no ya para vivir sino para vivir bien, y entre los bienes comunes los mejores son los que aumentan su bondad mientras más se comparten. <b>Y atravesando los dos, el eje divino</b>, del que no se hacen bienes sino que se participa, y que mide a los otros dos. El término no es el reposo sino la actividad sin movimiento, que al hombre le toca por poco tiempo; el reposo que sí le corresponde es la estabilidad de la disposición, la del que no va y viene con la fortuna. Acercarse a lo divino es avanzar en el camino de la areté; alejarse —siempre posible en una existencia imprevisible— es desviarse de él.',
  riskT:'Por qué los demás quedan entregados a lo fortuito',
  risk:'Fuera de Aristóteles ningún autor de la grilla piensa la praxis como este movimiento: una trayectoria de movimientos y reposos que avanza por superación continua en la excelencia y que está tensada por dos polos que no se confunden. Sin ese camino no hay avance racional ni fundado, y lo que queda es el azar en alguna de sus formas: el azar del nacimiento y la educación, el de la historia, el del sentimiento, el de la decisión sin criterio, el de la gracia. La objeción ya estaba puesta de antemano: dejar lo más grande y lo más bello entregado a la suerte sería demasiado desafinado.',
  noteT:'No confundir con los dioses',
  note:'To theîon no son los dioses de los relatos —los de Homero y Hesíodo, piadosos pero antropomórficos, con contratos, valentías y depósitos que devolver—. De esos dioses se dice con razón que la virtud ética no les cabe, y ese argumento no toca a to theîon: pura energeia del primer motor, sustancia separada, actividad sin resto. La fórmula que usamos para esa posición es <b>separado pero no legislador</b>.',
  loci:['Met. XII.7 1072a26-30','Met. XII.7 1072b24-26','Met. XII.9 1074b33-35','EE VIII.3 1249b16-21','De An. II.4 415a26-b7','EN VII.1 1145a25-28','EN X.7 1177b31-34','EN X.9 1179b4-16','EN I.9 1099b20-25','EN I.2 1094b9-10','GC II.10 336b31-34'],
  actions:'<button class="btn" data-kind="concepto" data-id="phusis">Volver al primer pilar: <span class="gr">&nbsp;phúsis</span></button>'+
    '<button class="btn" data-kind="concepto" data-id="ergon">Ir a <span class="gr">&nbsp;ergon · energeia</span></button>'+
    '<button class="btn" data-kind="capa" data-id="metafisica">Ver la bifurcación con Berti</button>'
},
bios: {
  eyebrow:'Ficha de arista · condición de areté a eudaimonía',
  g:'bíos téleios', es:'vida completa',
  lede:'La segunda condición de la cadena. La areté no basta para la eudaimonía: hace falta que la actividad excelente sea completa y que dure.',
  whyT:'Qué condiciona',
  why:'Es la etiqueta de la flecha que va de areté a eudaimonía. Sin ella la felicidad quedaría en un episodio; con ella se vuelve una forma de vida entera, y queda expuesta al tiempo y a la fortuna. Esa exposición es el precio de ser humana, no un defecto de la teoría.',
  sec:'Tres precisiones',
  facets:[
    ['Completa en dos sentidos a la vez','Completa la virtud —la mejor y más perfecta, si hay varias— y completa la vida: una golondrina no hace primavera, ni tampoco un solo día; así que ni un día ni un tiempo breve hacen a nadie dichoso.'],
    ['Hace falta tiempo, y el tiempo trae fortuna','En una vida larga caben muchas vueltas de la suerte, y el que era dichoso puede terminar como Príamo. Por eso la eudaimonía no se declara antes del final, y por eso los bienes externos y la buena fortuna entran en la cuenta sin ser su núcleo.'],
    ['Durar no es inercia: es estabilidad','El dichoso no va y viene con la suerte como una veleta, porque las actividades según la virtud son lo más estable que hay. La duración que cuenta es la de la disposición puesta en obra, no la del tiempo transcurrido.']
  ],
  ownT:'Y por qué esta arista mira a lo divino',
  own:'Durar es el modo en que lo mortal se acerca a lo perpetuo: todo viviente engendra para participar de lo eterno y lo divino en la medida en que puede. La vida completa es la versión singular de eso mismo, y la comunidad la versión amplia —por eso el bien de la ciudad es más divino—. Aquí esta arista se toca con el segundo pilar.',
  loci:['EN I.7 1098a18-20','EN I.9 1100a5-9','EN I.10 1100b11-22','EN I.11 1101a6-13','De An. II.4 415a26-b7'],
  actions:'<button class="btn" data-kind="concepto" data-id="arete">Volver a <span class="gr">&nbsp;areté</span></button>'+
    '<button class="btn" data-kind="concepto" data-id="eudaimonia">Ir a <span class="gr">&nbsp;eudaimonía</span></button>'+
    '<button class="btn" data-kind="aux" data-id="theion">Ver <span class="gr">&nbsp;to theîon</span></button>'
}
};

const GROUPS = [
  ['formacion','La formación de la cadena',['socrates','platon','aristoteles']],
  ['herencia','La herencia antigua y medieval',['plotino','agustin','tomas']],
  ['crisis','La crisis de la solución clásica',['descartes','spinoza','leibniz','hume','kant']],
  ['intentos','Los nuevos intentos y su fracaso',['hegel','marx','nietzsche','moore','scheler','sartre']],
  ['restauradores','Los restauradores',['rosmini','maritain']]
];
