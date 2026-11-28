# Ágora — N1-U.19.3.5e · Contrato provisional de tagueo semántico V1

**Estado:** piloto editorial, no publicación de tags. Base `updating`, `4f0ff90723978b74b7cdbf4affc71816e9ca245c` (`tagueo01`). Complementa `CONTRATO_TAGUEO_PROXIMOS_CAPITULOS_V1.md`; no lo sustituye. Formato `agora.articulaciones.v1`. Conserva 19.3.5d como referencia.

## 1. Propósito y principio de economía

La capa intermedia es un grafo local por unidad, fundamentado en subunidades. No es una nueva segmentación obligatoria. Separar identidad conceptual, acepción registrada, manifestación contextual, función sintáctica, afirmación, justificación, evidencia y continuación editorial. Una respuesta debe satisfacer la inquietud y permitir otras preguntas sin imponerlas. Phýsis y theîon orientan la elección de hilos, no certifican verdades ni crean relaciones. La hipótesis de aitía como criterio vertical sigue abierta.

## 2. Modelo mínimo del catálogo

| Registro | Campos y regla |
|---|---|
| Catálogo | schema, incremento, estado, revision_catalogo, texto (archivo y hash de referencia); nucleos, transiciones, recorridos, horizontes_abiertos; fuentes y propuestas separadas. |
| Núcleo | id estable, unidad, formulacion, funcion_argumentativa, voz, estado, limite, pregunta_continuacion; evidencias, manifestaciones, relaciones; aristas_funcionales_existentes opcionales como referencias, no copia de aristas. |
| Evidencia | obra, libro, unidad, subunidad, parrafo_local, gr_ancla. En V1 el piloto acepta EN I. No confundir ancla de párrafo con offset verificado de subunidad. |
| Manifestación | id local al núcleo, concepto con namespace, sentido registrado o null, determinacion, papel_local, evidencia (índice cero en el núcleo), ancla, expreso booleano. funcion_sintactica opcional. Si implícita, explicar por qué (justificacion_implicito; completar gradualmente las antiguas). |
| Relación contextual | de y a son IDs de manifestaciones del mismo núcleo, rel, justificacion, voz, estado. No se exporta como relación filosófica general entre los conceptos. |
| Transición | de/a IDs de núcleos, tipo, pregunta, justificacion, voz, estado, orientaciones. Es una propuesta de continuación, no una implicación lógica. |
| Recorrido | id, entrada, orden, respuesta, hilo, orientacion_editorial, seguimiento, horizonte: presupuesto_posible, suelo_textual, interrogantes. No atribuir el presupuesto al lector sin confirmación. |
| Horizonte abierto | Referencia a un núcleo, pregunta, referencias externas, estado pendiente. No es una respuesta ni un nodo navegable. |
| Propuesta de sentido | concepto, id, label, def, referencia, fuente, alcance, estado y voz. `sentido_candidato` permite citarla sin falsear el campo sentido. No se confirma por importación. |
| Nota hermenéutica | id, concepto, autor, obra, referencia, url, texto, estado, voz, nucleos. Nunca evidencia primaria ni voz textual. |

Los papeles sintácticos son opcionales y locales; no constituyen nuevos sentidos. Los papeles argumentativos se refieren al uso en una investigación, no a una propiedad esencial del concepto. Una manifestación puede ser candidata a una ficha o FAQ sin adquirir ese papel hasta una decisión editorial; los vínculos concretos se definirán al integrar fichas. Evitar etiquetas artificiales cuando basta una relación o nota.

## 3. Vocabulario de relaciones

El diccionario `familias_relacion` cubre los tipos contextuales del piloto y los agrupa en siete familias: determinativa, clasificatoria, teleológica, condicional, dinámica, metodológica y contrastiva. Es una clasificación editorial local, no reemplaza `rel`; no normaliza todavía las 42 relaciones históricas del árbol funcional. Ninguna familia autoriza invertir aristas, transitividad, causalidad o inferencia. Las transiciones de navegación se mantienen separadas de las relaciones de manifestaciones. Las evidencias y remisiones son vínculos documentales distintos.

## 4. Lógos: nueva acepción y registro hermenéutico

Conservar `logos#argumento` y `logos#razon`. Proponer `logos#lenguaje` (palabra articulada, comunicación humana de lo conveniente/perjudicial y justo/injusto) a partir de Política I.2, 1253a9–18. Fuente externa: https://reader.humanitext.ai/en/read/urn%3Acts%3AgreekLit%3Atlg0086.tlg035.humanitext-grc2%3A1.1253a. No se añade al catálogo de MariaDB todavía. En EN I.13, 1102b28–33, el deseo participa de razón y las amonestaciones/exhortaciones son evidencia de persuasión. En n16 se conserva `logos#razon` para λόγου; los actos de palabra remiten al concepto sin sentido registrado, con `sentido_candidato=lenguaje`, `expreso=false` y justificación. No se afirma que λόγου signifique exclusivamente lenguaje aquí.

La nota de légein (λέγειν: decir, recoger/reunir) recoge una lectura hermenéutica de Heidegger, *Logos (Heráclito, fragmento 50)*: reunir y dejar comparecer. Véase https://revistaletras.unmsm.edu.pe/index.php/le/es/article/view/2194 y el estudio https://link.springer.com/article/10.1007/s11841-023-00966-z. No presentar la lectura como definición universal aristotélica. Técnica e imagen del mundo quedan como investigación futura, al igual que los ejemplos de Berti en *Il bene*. Prioridad: orientación naturalista y mediterránea; no aplicar vocabulario naturalista contra el griego.

Blair: localizado *Energeia and Entelecheia: “Act” in Aristotle*, University of Ottawa Press, en https://docs.google.com/document/d/1_DpXGwYI0kcuvqOtLxRNTeXxSs_OHOAAQPw1oQBCOYQ/edit?tab=t.0. Portada, índice y prefacio consultados; II §6 (aplicaciones éticas, p. 72 ss.) y III son prioridades de lectura. El artículo de 1978 sigue siendo la fuente de la hipótesis diacrónica de integración de entelecheia en energeia. No se ha efectuado todavía lectura completa del libro.

## 5. Ritual de anotación

1. Seleccionar una unidad y una afirmación relevante. Identificar subunidad, obra, libro, párrafo y ancla griega. Reutilizar concepto/sentido exacto o proponer explícitamente el nuevo sentido.
2. Anotar manifestación y determinación contextual; sintaxis si resuelve una ambigüedad. Distinguir mención, negación, contraste e implicación editorial. La coaparición no basta para una relación.
3. Formular un núcleo con justificación y límites. Elegir el tipo de relación específico de manera direccional; familia como índice de consulta. Una definición multiconceptual no se descompone en equivalencias binarias. Conservar «virtud completa en una vida entera».
4. Registrar transiciones con una pregunta y una justificación. Seleccionar posibles horizontes; evitar la imposición de una criba al usuario.
5. Verificar referencias, anclas, sentidos, estados y continuidad. El validador no certifica verdad, interpretación, exactitud sintáctica ni offsets. Aprobar explícitamente antes de modificar tags. Para el Libro II debe resolverse la identidad textual estable y generalizar el constructor del corpus.

## 6. Expresión futura en grafos (no sintaxis habilitada todavía)

`(Nucleo)-[:CONTIENE]->(Manifestacion)-[:MANIFIESTA]->(Concepto)`; el sentido, si está registrado, se conserva como propiedad o enlace a Sentido. `(:Manifestacion)-[:RELACION_CONTEXTUAL {rel, familia, voz, estado}]->(:Manifestacion)`; `(:Nucleo)-[:FUNDAMENTADO_EN]->(:Evidencia)`; `(:Nucleo)-[:CONTINUA_CON]->(:Nucleo)`. La identidad proyectada de manifestación es núcleo/id; el índice de evidencia solo tiene alcance local, no es ID global. Al publicar un nuevo corpus se validan referencias y se comparan versiones, no se reescribe silenciosamente el pasado.

## 7. Criterio de cierre de 19.3.5e

El piloto V1 valida estructura y referencias en el visor; conserva los 15 núcleos previos (solo se añade sintaxis a dos manifestaciones) y añade n16, dos transiciones y una pregunta. Siguiente 19.3.5f: revisar decisiones pendientes, distinguir cambios aprobados de propuestas, contrastar 12–20 pasajes, revisar límites y exactitud de las subunidades, definir la aplicación editorial sin perder disposiciones. Después 19.3.6: proyección y consultas Cypher/LLM, sin convertir etiquetas candidatas ni horizontes pendientes en hechos. No hay migración SQL ni edición directa de GitHub.
