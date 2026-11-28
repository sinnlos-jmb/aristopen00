const AUTHORS = {
socrates: { name:'Sócrates', sub:'El bien es saber', berti:'socrates', cells:{
  phusis:['desplaza','Aparta la indagación de la phúsis de los físicos y la lleva al alma. La naturaleza deja de ser el terreno donde se busca el bien, aunque no se la niegue.'],
  logos:['conserva','El bien es objeto de saber y se busca dialogando. El logos queda instalado en el centro: es el aporte que funda toda la cadena posterior.'],
  ergon:['desplaza','Hay ergon del alma —vivir, gobernar, deliberar—, pero sin la distinción potencia/acto la obra queda absorbida en el saber de la obra.'],
  arete:['desplaza','La areté es saber. Se gana la inteligibilidad y se pierden el hábito, la elección y el ejercicio: la virtud se enseña en vez de adquirirse obrando.'],
  eudaimonia:['conserva','El que conoce el bien es feliz, y nadie prefiere ser desgraciado. El fin sigue siendo la vida lograda, no un deber ni un sentimiento.'],
  koinonia:['conserva','La virtud se examina en la plaza y ante los demás. El bien del hombre es inseparable de la ciudad, hasta el punto de morir por sus leyes.']},
  unbroken:'la cadena todavía no está armada',
  aporia:'Si la virtud es saber, nadie yerra queriéndolo —y entonces la akrasia no existe y el ejercicio sobra. Toda la Ética a Nicómaco II y VII es la respuesta a esta aporía.'},

platon: { name:'Platón', sub:'El bien más allá de la esencia', berti:'platon', cells:{
  phusis:['rompe','El ser verdadero se coloca fuera de la naturaleza sensible: la phúsis pasa a ser copia. Al quitarle a la naturaleza el principio interno, el fin tiene que venir de otra parte.'],
  logos:['conserva','Dialéctica ascendente: el bien se conoce, aunque cueste y aunque encandile. El logos conserva su oficio de conocer el fin.'],
  ergon:['desplaza','Hay ergon —el alma tiene su obra propia, Rep. I 352d-353e—, pero el acto no es todavía categoría: el bien es idea, no estar-en-obra.'],
  arete:['desplaza','Virtud como armonía de las partes del alma, medida por la idea. Se conserva la excelencia y se pierde su vínculo con la obra realizada.'],
  eudaimonia:['conserva','El justo es feliz y el injusto desgraciado, aunque parezca lo contrario. El fin sigue siendo la vida lograda.'],
  koinonia:['conserva','La justicia se lee primero en grande, en la ciudad, y después en el alma. La comunidad es el lugar donde el bien se vuelve legible.']},
  aporia:'Un bien que está más allá de la esencia en dignidad y potencia explica todo y no hace nada: no dice qué hacer mañana. Es la objeción de EN I.6.',
  note:'Nota al texto fuente: Berti remite a Rep. 509c; el pasaje es 509b.'},

aristoteles: { name:'Aristóteles', sub:'La cadena íntegra', berti:'aristoteles', cells:{
  phusis:['conserva','Naturaleza como principio interno de movimiento y como forma-fin. Hay fin en la naturaleza aunque no delibere.'],
  logos:['conserva','El logos determina el ergon del hombre, delibera (phrónesis) y funda la comunidad. Los tres oficios juntos y sin contradicción.'],
  ergon:['conserva','El bien del hombre es actividad del alma según la areté; y la energeia es el fin, no el medio. El eslabón existe por primera y última vez completo.'],
  arete:['conserva','Hexis prohairetiké adquirida por ejercicio, medida por el phrónimos, ni natural ni contra natura.'],
  eudaimonia:['conserva','Actividad según la virtud más completa en una vida completa. Ni sentimiento, ni premio, ni idea separada.'],
  koinonia:['conserva','La polis es por naturaleza y es anterior en el orden del fin; el bien de la ciudad es más bello y más divino que el de uno solo.']},
  origin:{ nodes:['ergon'], text:'La enérgeia tiene aquí un sentido que sólo aquí tiene fundamento: el de exigencia de la filosofía práctica. El bien estudiado no queda entendido, tiene que quedar hecho —en el carácter, en los actos y en las leyes—, y esa es la medida de la investigación misma. Los demás o lo bloquean (Kant: la buena voluntad brillaría aunque no lograse nada; Moore: el bien es indefinible y sólo intuible; Hegel: el pensamiento llega siempre tarde) o lo reclaman sin la base que lo haría medible —Hume es el caso expreso: mantiene que la filosofía práctica debe hacer mejores a los hombres justo después de suprimir la phúsis y el érgon, y sin ellos no hay criterio de qué bien se realizó—. Por eso la marca no dice que el sentido no reaparezca, sino que sólo aquí está fundado: en los demás vuelve como propósito huérfano, y eso es una recuperación sin base.'},
  aporia:'Queda abierto el enlace entre la vida teorética (X.7) y la vida política: dos felicidades sin jerarquía del todo resuelta. Es una aporía interna, no una ruptura: el sistema se sostiene sin cerrarla.'},

plotino: { name:'Plotino', sub:'El Uno más allá del ser', berti:'plotino', cells:{
  phusis:['rompe','La naturaleza es el último y más débil eco del Uno. El bien está por encima del ser y de la vida: la phúsis deja de poder contenerlo.'],
  logos:['desplaza','Hay logoi seminales, pero la vía al bien es la ascensión y el éxtasis, no la deliberación. El logos deja de ser el órgano del bien.'],
  ergon:['desplaza','Conserva energeia —y con fuerza inmensa: el Uno es actividad pura— pero como emanación descendente, no como obra del hombre. Se salva la palabra y se pierde el eslabón.'],
  arete:['desplaza','Virtudes purificativas: separan del cuerpo y de la ciudad más que perfeccionan una vida.'],
  eudaimonia:['desplaza','Felicidad como unión con el Uno, no como vida lograda en el tiempo. La eudaimonía se vuelve instante y no biografía.'],
  koinonia:['suprime','Huida a solas hacia el Solo. La comunidad deja de ser el lugar del bien y pasa a ser lo que hay que dejar atrás.']},
  aporia:'Si el bien es inefable y está más allá del ser, la ética se vuelve mística y deja de dar razones. Lo que se gana en altura se pierde en discutibilidad.'},

agustin: { name:'Agustín', sub:'El orden del amor', berti:'agustin', cells:{
  phusis:['desplaza','La naturaleza es criatura buena, pero herida. Su dinamismo ya no basta para llegar al fin: hace falta la gracia.'],
  logos:['desplaza','La razón busca, pero la iluminación la precede: creo para entender. El logos conserva su trabajo y pierde su autonomía.'],
  ergon:['rompe','El peso decisivo pasa al amor y a la voluntad —mi peso es mi amor—. La obra ya no consuma el fin: lo consuma la gracia. Aquí se corta el vínculo con la areté entendida como excelencia de la actividad.'],
  arete:['desplaza','Virtud como ordo amoris. Sin caridad, las virtudes paganas son vicios espléndidos: la excelencia deja de medirse por la obra bien hecha.'],
  eudaimonia:['desplaza','La beatitudo es real, pero escatológica: nuestro corazón está inquieto hasta que descanse en Ti. La vida lograda se traslada fuera de esta vida.'],
  koinonia:['desplaza','Dos ciudades. La terrena se tolera y se usa; no es el lugar propio del bien.']},
  aporia:'Si el fin sólo se alcanza fuera de la historia, la vida buena de aquí queda sin medida propia: se vuelve preparación, nunca realización.'},

tomas: { name:'Tomás de Aquino', sub:'La síntesis y su resto', berti:'tomas', cells:{
  phusis:['conserva','Recupera la naturaleza como principio y las inclinaciones naturales como base de la ley natural. Es la gran restitución del eslabón 1.'],
  logos:['conserva','Razón práctica, sindéresis, prudencia: el bien se conoce. El primer principio práctico es evidente, no mandado.'],
  ergon:['desplaza','Conserva actus y operatio, pero el acto se subordina al esse y a Dios como acto puro. El orden pasa a ser metafísico antes que práctico: la obra ya no es el fin, es la vía.'],
  arete:['conserva','Habitus operativus bonus, con la distinción entre virtudes adquiridas e infusas. La estructura aristotélica queda intacta.'],
  eudaimonia:['desplaza','Beatitudo imperfecta aquí, perfecta en la visión. El fin último se traslada, y con él la medida de la vida presente.'],
  koinonia:['conserva','Bien común como fin propio de la ley y de la comunidad política. La polis recupera consistencia.']},
  unbroken:'restaura sin recuperar el acto',
  aporia:'Con dos felicidades, una imperfecta y otra sobrenatural, ¿qué mide de suyo la vida terrena? La cadena se sostiene entera pero apuntando fuera de sí.'},

descartes: { name:'Descartes', sub:'La naturaleza sin fines', berti:'descartes', cells:{
  phusis:['suprime','La naturaleza queda reducida a extensión y movimiento: sin fines, sin formas, sin principio interno. Las causas finales son inútiles en física y presuntuosas en metafísica.'],
  logos:['desplaza','Razón fortísima, pero teórica: método de la certeza. La práctica queda en una moral por provisión, expresamente interina.'],
  ergon:['suprime','La física mecánica no deja lugar a potencia y acto: sólo partes que se empujan. Sin dentro no hay obra propia de nada.'],
  arete:['desplaza','La générosité: estima de sí por el buen uso del libre albedrío. Excelencia del querer, no de la obra.'],
  eudaimonia:['desplaza','Contentamiento del ánimo: un estado interior alcanzable por gobierno de las pasiones, no una vida lograda.'],
  koinonia:['rompe','El punto de partida es el yo solo junto a la estufa. La comunidad puede ser útil, pero ya no funda ni mide nada.']},
  aporia:'Una moral por provisión que nunca llega a ser definitiva. La certeza que buscaba no llegó nunca a la práctica, y el interinato dura hasta hoy.'},

spinoza: { name:'Spinoza', sub:'Potencia sin fin', berti:'spinoza', cells:{
  phusis:['rompe','Conserva una naturaleza omnipresente —Deus sive Natura— y le quita los fines: el apéndice de Ética I declara ilusoria toda teleología. Naturaleza total y ciega a la vez.'],
  logos:['conserva','Conocer es liberar: la razón sigue siendo la vía. En esto es el más clásico de los modernos.'],
  ergon:['desplaza','El conatus es dinamismo real, casi energeia —cada cosa se esfuerza por perseverar en su ser— pero sin fin al que tienda: potencia sin obra que consumar.'],
  arete:['desplaza','Virtus es potentia: capacidad de obrar, no excelencia ordenada a un fin. Se conserva el nombre y se le quita la medida.'],
  eudaimonia:['desplaza','La beatitud no es el premio de la virtud, sino la virtud misma. Frase magnífica que gana en lucidez lo que pierde en consumación.'],
  koinonia:['conserva','Nada más útil al hombre que el hombre. El vínculo político es condición de la vida racional, no un mal necesario.']},
  aporia:'Sin fin no hay «mejor»: bueno y malo son sólo lo que aumenta o disminuye nuestra potencia. La ética se vuelve dinámica de fuerzas y deja de poder decir hacia dónde.'},

leibniz: { name:'Leibniz', sub:'El mejor mundo ya está hecho', berti:'leibniz', cells:{
  phusis:['desplaza','Restituye fuerza y entelequia a la naturaleza —contra Descartes— pero dentro de una armonía preestablecida: nada obra hacia afuera.'],
  logos:['desplaza','Razón suficiente y cálculo: el bien se demuestra, no se delibera. La phrónesis se vuelve innecesaria.'],
  ergon:['desplaza','La vis activa recupera el acto, pero la mónada despliega un programa: no hay obra que pudiera haber salido distinta.'],
  arete:['rompe','Si éste es el mejor de los mundos posibles, la excelencia ya está puesta de antemano. La virtud no agrega nada al mundo y el vínculo con la eudaimonía se corta.'],
  eudaimonia:['desplaza','Felicidad como placer duradero del alma y progreso perpetuo: un asintótico, no una vida completa.'],
  koinonia:['desplaza','Ciudad de Dios como reino moral de los espíritus. Comunidad metáfisica, no polis.']},
  aporia:'Un optimismo que justifica todo justifica también lo que hay: el mal queda explicado y la acción, sin urgencia.'},

hume: { name:'Hume', sub:'Del ser no se sigue el deber', berti:'hume', cells:{
  phusis:['suprime','La naturaleza deja de dar normas: de proposiciones sobre lo que es no se sigue ninguna sobre lo que debe ser. El eslabón 1 no se discute: se declara ilegítimo.'],
  logos:['rompe','La razón es, y sólo debe ser, esclava de las pasiones. El bien no se conoce: se siente. Aquí se corta lo que Sócrates había fundado.'],
  ergon:['suprime','Sin causas finales ni potencia, la obra no tiene adonde tender. No queda nada que la actividad pueda consumar.'],
  arete:['desplaza','Conserva el nombre «virtud» y hasta el catálogo, pero medido por el sentimiento de aprobación del espectador imparcial.'],
  eudaimonia:['desplaza','Utilidad y agrado, propios o ajenos. La vida lograda se disuelve en un balance de sentimientos.'],
  koinonia:['conserva','La simpatía y la convención hacen sociedad, y el juicio moral sólo existe en el punto de vista común. El vínculo sobrevive a la demolición.']},
  recover:{ nodes:['ergon','koinonia'], text:'Conserva explícitamente la tarea práctica: la filosofía moral no tiene sólo el fin de conocer sino el de hacer mejores a los hombres e inducirlos a obrar bien. Es exactamente la exigencia aristotélica —el bien no se sabe, se lleva a término— mantenida después de haber suprimido la obra donde eso se realiza y la naturaleza que la medía. De ahí las dos marcas: el propósito sobre el érgon, que ya no puede medir nada, y el punto de vista común sobre la koinonía, que se invoca sin poder fundarse. Es la recuperación sin base más temprana y la más franca.'},
  aporia:'Si el juicio moral es un sentimiento, ¿por qué debería corregir el mío cuando difiere del tuyo? El punto de vista común se invoca, no se funda.'},

kant: { name:'Kant', sub:'La ley sin naturaleza', berti:'kant', cells:{
  phusis:['suprime','La naturaleza es el reino de la ley mecánica. El bien moral tiene que ser independiente de ella: si dependiera, sería heterónomo.'],
  logos:['rompe','La razón no conoce el bien: lo manda. Del logos queda la forma de la ley universal y desaparece el discernimiento del fin. Es la ruptura más consecuente de todas.'],
  ergon:['suprime','La buena voluntad brillaría por sí misma como una joya aunque no lograse nada. La obra deja expresamente de contar para el valor moral.'],
  arete:['desplaza','La virtud se vuelve fortaleza en el cumplimiento del deber contra la inclinación. Excelencia de resistencia, no de realización.'],
  eudaimonia:['suprime','La felicidad queda fuera de la moralidad: a lo sumo, objeto de esperanza en el bien supremo y postulado de otra vida.'],
  koinonia:['desplaza','El reino de los fines es ideal e inteligible. La comunidad real no funda nada, sólo lo ilustra.']},
  recover:{ nodes:['eudaimonia'], text:'Después de dejar la felicidad fuera de la fundamentación de la moral, repone el <i>sumo bien</i> como bien completo y total, unión de virtud y felicidad, igual que los antiguos y los medievales. Y como esa unión no es analítica y en esta vida no se verifica, tiene que postular a Dios y la inmortalidad para hacerla posible. La estructura clásica del bien completo vuelve entera, y vuelve exactamente donde su propia crítica ya no puede fundarla: como postulado.'},
  aporia:'Una ley que no se apoya en nada natural no puede decir qué hacer en un caso concreto: la prueba de universalización deja pasar demasiado y prohibe demasiado poco.'},

hegel: { name:'Hegel', sub:'Lo racional es lo real', berti:'hegel', cells:{
  phusis:['rompe','La naturaleza es el espíritu en su alienación: no principio, sino momento que hay que superar.'],
  logos:['desplaza','Razón fortísima, pero la del proceso. El individuo no delibera: reconoce lo que ya se hizo racional.'],
  ergon:['desplaza','Recupera actividad y obra en grande —el trabajo del concepto, el trabajo que forma— pero el sujeto es el espíritu, no este hombre.'],
  arete:['suprime','La virtud es una figura superada. En el Estado moderno lo que queda es la rectitud: cumplir lo que la propia posición exige.'],
  eudaimonia:['suprime','La historia universal no es el suelo de la felicidad: sus períodos felices son sus páginas en blanco.'],
  koinonia:['desplaza','La eticidad se cumple en el Estado; el bien común se vuelve resultado objetivo, no fin deliberado en común.']},
  recover:{ nodes:['eudaimonia'], text:'Por encima del Estado y del Espíritu del mundo pone el Espíritu absoluto —arte, religión y filosofía—, y sólo ahí culmina el proceso. El bien recupera de golpe lo que la eticidad histórica le había quitado: su carácter metapolítico y el rango supremo de la vida teórica, que es la tesis de EN X.7. Pero vuelve sin phúsis y sin fin propio del individuo: no es la vida lograda de alguien, es el saberse a sí mismo del proceso.'},
  aporia:'La lechuza de Minerva alza el vuelo al anochecer. Una filosofía que sólo comprende lo ya hecho no orienta ninguna acción —y sin embargo el sistema entero pretende ser práctico—.'},

marx: { name:'Marx', sub:'El reino de la libertad', berti:'marx', cells:{
  phusis:['desplaza','La naturaleza existe para el hombre como naturaleza humanizada por el trabajo: es material y es histórica, no es norma.'],
  logos:['rompe','No se trata de interpretar el mundo sino de transformarlo. La moral es ideología: el bien deja de ser algo que se conozca.'],
  ergon:['conserva','La esencia del hombre es su actividad vital libre y consciente. El ergon vuelve entero —y con el trabajo alienado como su privación— después de haber negado el logos que lo fundaba.'],
  arete:['suprime','No hay excelencia del carácter: hay condiciones de producción que forman o deforman al individuo.'],
  eudaimonia:['desplaza','El reino de la libertad más allá de la necesidad. La vida lograda existe, pero pospuesta a una condición histórica que aún no se da.'],
  koinonia:['conserva','El hombre es un ser genérico: la comunidad no es medio para fines privados, es el modo en que existe lo humano.']},
  recover:{ nodes:['ergon','koinonia'], text:'Recupera la energeia y la koinonía después de haber negado el logos que las fundaba. El reino de la libertad —desplegar las propias fuerzas como fin en sí— es una eudaimonía sin ética: la estructura aristotélica completa, sostenida por una filosofía que declaró imposible justificarla.'},
  aporia:'Si toda moral es ideología de clase, ¿en nombre de qué se denuncia la explotación? La indignación del texto excede siempre lo que la teoría se permite fundar.'},

nietzsche: { name:'Nietzsche', sub:'La supresión del logos', berti:'nietzsche', cells:{
  phusis:['desplaza','Vuelve a la naturaleza, pero como voluntad de poder: fuerza sin fin y sin forma. La phúsis reaparece vaciada de aquello que la hacía normativa.'],
  logos:['suprime','Renuncia deliberada a justificar: no hay hechos morales, sólo interpretaciones morales. No es que el bien sea difícil de conocer: la pregunta misma es síntoma.'],
  ergon:['desplaza','Hay actividad desbordante y gran salud, pero es expansión de fuerza, no obra que consuma una naturaleza.'],
  arete:['desplaza','Virtù sin moralina, virtud que hace regalos. Excelencia sin medida común y sin fin: aristocrática e incomunicable.'],
  eudaimonia:['suprime','El hombre no aspira a la felicidad; sólo el inglés lo hace. La eudaimonía se declara meta de mediocres.'],
  koinonia:['suprime','El rebaño es lo contrario del valor. El bien común es una contradicción en los términos.']},
  aporia:'Si todo valor es creado, el valor que yo creo no obliga a nadie —ni siquiera a mí mañana—. La transvaloración necesita una autoridad que su propio principio destruye.'},

moore: { name:'Moore', sub:'El bien indefinible', berti:'moore', cells:{
  phusis:['suprime','Falacia naturalista: de ninguna propiedad natural se sigue el bien. El eslabón 1 se declara lógicamente prohibido.'],
  logos:['rompe','El bien es simple e indefinible: se intuye, como el amarillo. No se razona, no se aprende, no se discute.'],
  ergon:['suprime','El bien es propiedad de estados de cosas, no actividad de nadie. No hay sujeto que obre.'],
  arete:['suprime','Las virtudes son sólo disposiciones a producir estados buenos: pierden todo valor propio y quedan como medios.'],
  eudaimonia:['desplaza','Los bienes máximos son el trato con los amigos y la contemplación de lo bello, y valen como fines en sí. Recupera la estructura del fin en sí que su propia falacia le prohibió fundar.'],
  koinonia:['desplaza','La amistad es un bien máximo, pero como estado de conciencia valioso, no como forma de vida común.']},
  recover:{ nodes:['eudaimonia'], text:'Después de prohibir derivar el bien de cualquier propiedad natural, termina sosteniendo que hay fines en sí mismos y que son la amistad y la contemplación de lo bello —exactamente los dos bienes de EN VIII-IX y X.7—. La conclusión aristotélica queda en pie sin ninguna premisa que la sostenga.'},
  aporia:'Si el bien es indefinible y se intuye, dos intuiciones opuestas no tienen cómo dirimirse. El intuicionismo es infalible y estéril a la vez.'},

scheler: { name:'Scheler · Hartmann', sub:'El cielo de los valores', berti:'scheler', cells:{
  phusis:['rompe','Los valores tienen un ser ideal propio, independiente de la naturaleza y de quien los percibe. El fin ya no está en las cosas: está en un orden aparte.'],
  logos:['rompe','Los valores se captan por intuición emocional —Wertfühlen, ordo amoris—, no por razón. Se corta de nuevo el vínculo entre conocer y valer.'],
  ergon:['desplaza','La realización del valor es tarea del hombre, pero el valor vale antes y sin la obra. La obra deja de constituir el bien: sólo lo actualiza.'],
  arete:['desplaza','Virtud como capacidad de percibir y realizar valores según una jerarquía dada de antemano.'],
  eudaimonia:['desplaza','Hartmann: el bien es la conexión teleológica del valor. Vuelve la estructura del fin, sin naturaleza que la sostenga.'],
  koinonia:['conserva','Persona comunitaria y solidaridad: la comunidad es constitutiva de la persona, no un agregado.']},
  recover:{ nodes:['eudaimonia'], text:'Hartmann define el bien como la conexión teleológica del valor: restituye la teleología del lado del valor justo después de habérsela quitado a la naturaleza. La estructura finalista es irrenunciable incluso para quien le retiró el suelo.'},
  aporia:'Un cielo de valores que vale por sí mismo, pero al que sólo se accede por un sentir. La jerarquía es objetiva y, a la vez, indiscutible.'},

sartre: { name:'Sartre', sub:'Sin naturaleza y sin signos', berti:'sartre', cells:{
  phusis:['suprime','La existencia precede a la esencia: no hay naturaleza humana porque no hay Dios que la conciba. El eslabón 1 se niega de entrada y explícitamente.'],
  logos:['rompe','Ningún signo en el mundo dice qué hacer: el ejemplo del joven entre su madre y la Resistencia está puesto justamente para mostrar que la razón no decide.'],
  ergon:['desplaza','Hay acto, y sólo acto: el hombre no es más que lo que hace. Pero es acto sin ergon, actividad sin obra que le corresponda.'],
  arete:['suprime','No hay carácter ni hábito que valgan: cada elección rehace al hombre entero y la excusa del temperamento es mala fe.'],
  eudaimonia:['suprime','El hombre es una pasión inútil. No hay vida lograda: hay proyecto que fracasa.'],
  koinonia:['rompe','Al elegirme elijo al hombre: una universalidad afirmada, no una comunidad que funde nada. El otro es primero mirada que cosifica.']},
  aporia:'Si la libertad es absoluta, cualquier elección vale lo mismo —y el compromiso que Sartre exige no se distingue de su contrario—. El existencialismo es un humanismo es el intento, fallido, de responder esto.'},

rosmini: { name:'Rosmini', sub:'Reconoce el ser como es', berti:'rosmini', cells:{
  phusis:['desplaza','Naturaleza como orden del ser conocido, de raíz platónico-agustiniana: la luz del ser ideal, no el dinamismo interno de la phúsis.'],
  logos:['conserva','El bien vuelve a ser objeto de conocimiento: la fórmula misma —reconoce el ser— pone al conocer antes que al mandar. Es una restitución real del eslabón 2.'],
  ergon:['rompe','El principio es reconocer prácticamente el ser como es: un imperativo de adecuación de la voluntad al orden, no una obra que realizar. El acto no vuelve.'],
  arete:['desplaza','Virtud como rectitud de la voluntad frente al orden del ser: se mide por la adecuación, no por la excelencia de la actividad.'],
  eudaimonia:['desplaza','La beatitud es real, pero como término religioso de la persona más que como vida lograda en el tiempo.'],
  koinonia:['conserva','La persona es derecho subsistente, y las sociedades tienen fin propio. El vínculo recupera consistencia ontológica.']},
  aporia:'Restaura el finalismo sin restaurar el acto: el bien queda como orden que hay que reconocer, no como vida que hay que hacer. Es la restauración incompleta típica del siglo XIX.'},

maritain: { name:'Maritain', sub:'Humanismo integral', berti:'maritain', cells:{
  phusis:['conserva','Naturaleza humana real y ley natural conocida por inclinación, no deducida. El eslabón 1 vuelve en serio.'],
  logos:['conserva','Conocimiento por connaturalidad y razón práctica: el bien se conoce, y se conoce también de un modo que no es discursivo.'],
  ergon:['desplaza','Conserva actus y operatio tomistas, pero el acento cae en el fin último y en la persona. El estar-en-obra no recupera el lugar central.'],
  arete:['conserva','Virtudes como perfecciones reales de la persona, no como cumplimiento de deberes.'],
  eudaimonia:['desplaza','Fin último trascendente; el bien común temporal es fin intermedio e infravalente. La vida lograda de aquí sigue apuntando a otra.'],
  koinonia:['conserva','Bien común como fin propio de la ciudad y redistribuible en las personas. Es su aporte mayor y el más vigente.']},
  unbroken:'restaura sin recuperar el acto',
  aporia:'Sin ruptura decisiva, pero tampoco recuperación del acto: el humanismo integral se apoya en el fin y en la persona, no en la obra. Conserva cuatro eslabones y desplaza dos —el ergon y la eudaimonía—, que son justamente los dos que harían falta.',
  note:'Junto con Rosmini: restauran el finalismo y el bien común —por vía platónico-agustiniana el primero, tomista el segundo— sin recuperar la energeia. Ese hueco es el punto de partida de nuestra propuesta.'}
};
