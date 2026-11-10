# Grafos de la Ética nicomáquea — cierre de la etapa 1

Proyecto de grafos interactivos sobre la *Ética nicomáquea* (EN), con foco en el libro I y en el argumento del érgon (I.7). Esta carpeta es la versión de cierre de la primera etapa (v36, 16 de octubre de 2026). Para verla, se abre cualquier `.html` en el navegador; no necesita servidor.

## Grafos

| Archivo | Datos | Tema | Versión |
|---|---|---|---|
| grafo_intro.html | js/grafo0.data.js | Filosofía práctica · introducción · EN I.1–7, VI.1–5, X.6–9 | v7.2 |
| grafo_cero.html | js/grafoCero.data.js | Grafo cero · versión básica · EN I.7, II.1, X.7–8 | v5.1 |
| grafo_bien.html | js/grafo2.data.js | El bien como fin · EN I.1–6 | v4.1 |
| grafo_bienes.html | js/grafo3.data.js | Tipos de bienes | v5 |
| grafo_felicidad.html | js/grafo1.data.js | Condiciones de la felicidad · EN I.7–10, I.13, II.1–6, X.6–8 | v1.1 |
| grafo_ergon.html | js/grafo4.data.js | El argumento del érgon · mapa del capítulo | v4.4 |
| grafo_ergon_forma.html | js/grafo4a.data.js | La forma del fin · completo y autosuficiente · 1097a15–b21 | v2.7 |
| grafo_ergon_obra.html | js/grafo4b.data.js | La función propia · de la criba a la definición · 1097b22–1098a20 | v3.5 |
| grafo_ergon_esbozo.html | js/grafo4c.data.js | Esbozo y método · el rigor, el hecho y los principios · 1098a20–b8 | v1 |
| grafo_confirmacion.html | js/grafo4d.data.js | La confirmación · las opiniones, la virtud en acto, el placer y los bienes exteriores · EN I.8, 1098b9–1099b8 | v1 |
| grafo_esferas.html | js/grafoEsferas.data.js | Las tres esferas | v3.1 |
| grafo_alma.html | js/grafoAlma.data.js | El alma · partes, facultades y virtudes · EN I.13, VI | v1 |

Motor común: `js/grafos.js` (no se modifica por grafo), `js/calif.js`, `js/donde.js`, `js/grafos.index.js` (índice de grafos para los enlaces) y `css/grafos.css`.

## Criterios de construcción

- **Economía de nodos.** El peso conceptual va en las fichas, no en la cantidad de nodos. Los grafos son estáticos: no hay etapas ni animaciones de despliegue.
- **Etiquetas.** Van en español, con el término griego aparte (`gr`). Las coordenadas que fijó manu no se tocan.
- **Lectura nuestra.** Toda extrapolación propia está marcada en la ficha como tal (por ejemplo, el «imperativo» de la phýsis o la tesis de la areté como incremento). El texto de Aristóteles y la interpretación nuestra no se confunden.
- **Debates.** Cuando hay controversia (por ejemplo, Gómez-Lobo y Barney sobre el érgon), primero se presenta el debate de manera objetiva y al final se sugiere nuestra posición. A los autores no se los sintetiza en exceso.

### Los nodos originarios: Phýsis y Lo divino

- **Phýsis** tiene una ὁρμή saliente, con trazo punteado: es el impulso que urge desde adentro. Es el origen del érgon y también de la inclinación por la areté, «un imperativo que mueve e interpela al alma en lo más íntimo». La palabra «imperativo» es nuestra y no designa una ley externa. Su τέλος, con trazo sólido, llega a una potencialidad.
- **Lo divino (τὸ θεῖον)** recibe ἕλξεις entrantes, con trazo punteado: atrae, no empuja. Su τέλος, con trazo sólido, llega a la ἐνέργεια.
- **Regla general.** La arista que llega a lo divino corresponde al logos natural y a la areté. El τέλος que sale de lo divino corresponde al logos divino y a la ἐνέργεια. Primero viene la areté; después, la ἐνέργεια.
- **Los dioses.** En Phýsis aparece como rechazo del mecanicismo; en lo divino, como un logos superador. Lo divino orienta; no ordena ni prescribe: la que prescribe es la prudencia.
- **Tesis de fondo (nuestra).** La areté es incremento, y la causa del salto está en lo divino.

### Tipos de arista

Cada arista tiene `rel` (tipo de relación), `label` (en griego cuando corresponde), `title`, `desc` y `ref`. Las aristas punteadas (`kind`) marcan los vínculos originarios: ὁρμή y ἕλξις.

## Estructura de los datos

Cada `js/<grafo>.data.js` define `NODES`, `EDGES`, `FIELDS` y `COLLAPSED`.

- Nodo: `{id, conceptId, concepto?, label, gr, x, y, r, type?, subs?, links?, desc, ref}`. `conceptId` es la identidad del concepto entre grafos: un enlace apunta a un concepto, no a una posición. `concepto` (D42) es el id del concepto en el tagueo cuando `conceptId` no lo es; `conceptId` no se cambia porque sirve de ancla entre grafos.
- Enlace entre grafos: `{graph, file, label, concept}`.
- Arista: `{id, source, target, label, title, rel, desc, ref, ref_cf?, kind?, showWith?, labelDx?, labelDy?}`. Desde D42, `ref` es el tramo principal y estrecho de la relación, y `ref_cf` reúne los lugares de cotejo; la ficha de la arista los muestra como «ref · cf. ref_cf».

## Índice de referencias (puente hacia el tagueo)

`data/refs_index.json` reúne cada referencia de cada nodo y cada arista de los grafos (doce desde D42; también `ref_cf` como `raw_cf`/`refs_cf`, y el concepto del nodo), parseada en estos campos: obra, libro y capítulo, y los loci con inicio y fin. Los loci van en Bekker para Aristóteles, en Stephanus para Platón y en versos para Aristófanes. La obra y el capítulo se heredan dentro de una misma referencia («EN I.7, …; I.8» hereda EN; «…, 20–21» hereda página y columna).

Cuando se agregan o cambian fichas, se regenera desde la raíz del proyecto con `node tools/grafos-refs.mjs` (con `--check` solo informa). Reemplaza a `build/v36_refs.mjs`: las entradas cuya referencia no cambió conservan el parseo guardado, y solo se parsean las nuevas o modificadas.

`data/refs_revisar.txt` lista lo que el parser no pudo resolver solo. Esas referencias hay que corregirlas a mano, no a ciegas.

## Cambios desde el tagueo (etapa 2)

- **Esbozo y método (grafo4c, v1, D33).** Subgrafo nuevo del argumento del érgon para EN I.7, 1098a20–b8: el esbozo, el rigor según la materia, el carpintero y el geómetra, la causa y el hecho, y los caminos hacia los principios (inducción, percepción, habituación), con los dos nodos originarios. Se entra desde el Bien hallado del mapa (grafo4, v4.3), que lleva el signo de subgrafo.
- **La función propia (grafo4b, v3.5, D33).** Nodo «Hombre ejemplar» (σπουδαῖος) con dos aristas: la misma función en el género (τῷ γένει) y el obrar bien y bellamente según la virtud propia (εὖ καὶ καλῶς).
- **Voces.** La voz de cada arista (textual, comentarista, nuestra, éndoxon) se registra del lado del tagueo (`voces_grafos` en `tags_v4.json`); en 4a, 4b, 4c y 4d todas las aristas la tienen.
- **La confirmación (grafo4d, v1, D42).** Subgrafo nuevo del argumento del érgon para EN I.8, 1098b9–1099b8, con 18 nodos y 26 aristas en cinco tramos: las opiniones y las tres clases de bienes; la virtud en acto (χρῆσις, el ejemplo de Olimpia); el placer (φύσει ἡδέα, οὐ περίαπτον); lo mejor, lo más noble y lo más placentero contra el epigrama de Delos; y los bienes exteriores (ὄργανα, ῥυπαίνουσι, la buena fortuna como puente a I.9). Lleva los dos nodos originarios: la ὁρμή de la phýsis llega al placer y su τέλος a la disposición; la ἕλξις de lo noble llega a lo divino y su τέλος a lo mejor. Nace con D35 cumplido: todos los `conceptId` son ids del tagueo y cada arista tiene `ref` estrecho, `ref_cf` y voz. Se entra desde la Realización excelente del mapa (grafo4, v4.4), que lleva el signo de subgrafo.
- **Referencias de I.8 en los demás grafos (D42).** Solo metadatos, sin tocar la estructura: `ref_cf` en las aristas que citan I.8 (grafo 0, esferas, felicidad, bienes, 4b y 4c); `concepto` en `energeia_etica` y `energeia_noetica` (`energeia_actividad`) y en `hexis_etica` (`hexis`) del grafo de la felicidad; líneas Bekker en las citas «EN I.8» que no las tenían; y en el grafo 0 se saca «I.9, 1099a3–7» de `realismo--energeia` (ese pasaje es de I.8 y ya estaba en el tramo citado). El visor (`js/grafos.js`) muestra el cotejo en la ficha de la arista.

## Pendientes para la etapa 2

- Felicidad (grafo1): los desenlaces de I.10. Además, el nodo «conditions» no tiene referencia.
- El bien como fin (grafo2): títulos, nodos rechazados y coordenadas.
- Alma: VI.11, las virtudes menores, el αἰσθητικόν y el arte.
- «¿Dónde estoy?»: revisar la navegación.
- Los dioses en otros grafos: Atenea en technites (4b); Zeus en el threptikón y en el grafo cero; Apolo Liceo en la introducción o en el grafo cero; Delos en felicidad.
- El θαῦμα.
- Los sofistas: Met. Γ.4 y las potencias de contrarios de Met. Θ.2.
- Grafo cero: ἁμαρτία y μὴ ἄνευ λόγου.
- Preguntas abiertas: la σχολή, la parte noética y la ἕλξις en las esferas.
- SVG dinámico.
- Podar las fichas largas: acceso (unos 3700 caracteres), ἕλξις, τέλος de lo divino, areté de 4b y epipeithes.
- Completar la línea de «De An. II.1, 412a» (cuatro apariciones).

## Etapas siguientes

1. Tagueo del texto original y vectorización artesanal, cruzados con `data/refs_index.json`.
2. Bot de IA con similitud de cosenos que use los tipos de arista y respete las marcas de «lectura nuestra».
