# Ágora · N1-U.19.3.5f — Expediente de consolidación filosófica y editorial

Estado: propuesta para discusión y prueba local. Referencia: rama `updating` de `sinnlos-jmb/aristopen00`, catálogo `public/lab/n1u1935e-nucleos-semanticos.json` (blob `17b8df98f7fae0e69a0635684bb3792b769dcef6`). Complementa el contrato V1 y las notas de horizonte/bibliografía de 19.3.5e. No sustituye ni promueve el catálogo.

## 1. Decisiones para discutir

| Objeto | Recomendación | Límite |
|---|---|---|
| `energeia_acto`, `energeia_actividad` | Agrupación semántica en lugar de especie | No establecer dos realidades separadas ni resolver univocidad, analogía o evolución histórica por el árbol. |
| `ergon_obra`, `ergon_funcion` | Agrupación semántica en lugar de especie | Distinguir obra aparte y función; EN I.1 y I.7. Conservar los IDs. |
| `dunamis_capacidad`, `dunamis_potencia` | Aplazar | No extender por analogía las decisiones anteriores. |
| `logos#lenguaje` | Favorable a incorporar el sentido, previa aprobación explícita | Política I.2, 1253a9–18 es referencia externa. EN I.13 mantiene `logos#razon` y la manifestación implícita candidata. |
| `dunamis_capacidad#arte`, EN I.1 | Revisar la pertinencia de capacidad arquitectónica en 1094a9–16 | No identificar esta capacidad técnica con potencia metafísica. |
| `excelencia`, EN I.13 | Examinar la excelencia común no humana de 1102b3–11 | No atribuir virtud humana afirmativamente a esa ocurrencia. |

Ninguna de estas recomendaciones aplica escrituras a MariaDB. No cambiar definiciones, traducciones, estados editoriales, IDs ni aristas. «Virtud completa en una vida entera» permanece como formulación de Ágora.

## 2. Lectura de Blair y diálogo con Berti/Owens

George A. Blair, *Energeia and Entelecheia: “Act” in Aristotle*, University of Ottawa Press, II.6, especialmente «Ethical applications» (p. 72 ss. según índice) y la discusión previa de las aplicaciones de enérgeia. Fuente: documento compartido Books II on Aristotle, consultado en esta etapa. La sección y los pasajes fueron accesibles en texto extraído; no se ha comprobado toda la edición impresa ni su paginación/nota por nota. Se conserva la hipótesis diacrónica anterior como hipótesis interpretativa.

- Blair utiliza «internal activity» para conservar el carácter activo de enérgeia. Contrasta EN I.1 (obra aparte o actividad como fin) con Metafísica Θ.8 (actividad como fin y érgon; materia, forma, actividad). La diferencia contextual de érgon no impone dos especies ontológicas.
- Metafísica Θ.8: se posee vista para ver; el ejercicio no se reduce al estado de posesión. Relaciona esta prioridad con forma y fin. Esta interpretación requiere distinguir actividad inmanente y producción sin universalizar un esquema.
- Blair vincula héxis y actividad y examina EN II.1: las disposiciones se adquieren a partir de actividades de cierto tipo; esto abre una investigación sobre formación. No se añade todavía un tag del Libro II.
- En las aplicaciones éticas incluye virtud, felicidad, placer y amistad; examina EN I.7 como actividad excelente. No sustituir nuestra traducción por la suya sin una revisión textual específica.

El vínculo con Berti (realización de la forma humana como actividad) es una hipótesis de investigación, no equivalencia doctrinal. El análisis de la forma y de la causalidad en Owens requiere lectura y contraste propios. Preservar voces de intérpretes, fuentes primarias y reconstrucciones nuestras. Aún no se integran automáticamente los grafos bibliográficos con los árboles.

## 3. Retorno y apertura

Se añaden seis notas de navegación, externas al catálogo histórico: n05→n03, n06→n02, n11→n13, n13→n14, n04→n14 y n06→n14. Las notas no añaden aristas, no invierten relaciones ni cambian la prioridad de las orientaciones. El visor muestra la nota correspondiente al paso efectivo cuando procede.

Casos: «¿Ser virtuoso basta para ser feliz?» vuelve de la posesión al ejercicio y a la excelencia; «¿Para qué sirve la felicidad?» pasa del fin elegido por sí mismo a lo propio del ser humano y a su excelencia; «¿Qué significa lógos en la Ética?» permite volver a los principios del razonamiento y contrastarlos con la felicidad como principio de acción. Los recorridos existentes y las bifurcaciones no se modifican.

«¿Ser feliz es hacer lo que me gusta?» queda como ensayo editorial incompleto: examinar placer, bien y actividad antes de abrir la pregunta por lo que merece ser elegido. No hay todavía un núcleo específico de placer en el piloto. EN I.5, I.7 e I.8 son referencias a estudiar; no inventamos una ruta ya validada. No atribuir hedonismo o relativismo a quien pregunta. Retorno y apertura son recursos para el diálogo, no reglas de inferencia o clases de usuario.

## 4. Inventario y comprobaciones

El expediente contiene 17 casos de subunidad que cubren los 16 núcleos del piloto; sus referencias se cotejaron contra el catálogo remoto. El panel recupera del catálogo el ancla registrada y las incidencias del núcleo ya producidas por el visor. Las notas son criterios de lectura, no certificación filosófica ni verificación de offsets. Incluye las dos propuestas históricas de tagueo pendientes y verifica si las cuatro agrupaciones coinciden con la base activa.

El inventario funcional se calcula sobre las `arista_funcional` de `buildTagTrees`, excluyendo jerarquías, remisiones y asociaciones. Enumera el tipo original, cantidad, voces y ausencias de referencia. Si coincide exactamente con una etiqueta del diccionario de familias contextuales, se muestra como coincidencia nominal, no como equivalencia o clasificación aprobada. Las siete familias del piloto no se imponen automáticamente a las relaciones históricas. Los tipos activos y sus ejemplos deberán examinarse antes de aprobar una tabla de correspondencias. No se supone que la cantidad histórica de 42 tipos siga siendo la activa.

## 5. Libro II e integración posterior

Propuesta mínima de identidad: `EN:1:p27`, `EN:2:p27` distinguen párrafos locales, incluso si comparten numeración. Una subunidad conserva libro, unidad, ID y referencia Bekker; la edición y su versión/hash y anclas se conservan como datos separados. La estabilidad entre ediciones y cambios de segmentación requiere una tabla de concordancia, no se presume. Antes de migrar: inspeccionar el texto del Libro II, API, esquema de MariaDB, identidad de unidades y offsets. No alterar la numeración del Libro I.

Siguiente: aprobación editorial de cambios; revisar tabla de relaciones con el inventario activo, confirmar identidad textual y evidencias. En 19.3.6, proyectar núcleo/manifestación/concepto/evidencia y transiciones con voces y estados separados. Las transiciones de navegación no son deducciones ni nuevas afirmaciones filosóficas. En 19.4, grafos sincrónicos de las fichas.

## 6. Instalación y validación

Desde la raíz del repositorio (con 19.3.5e instalado):

```bat
git apply --check agora-n1u1935f-consolidacion.patch
git apply agora-n1u1935f-consolidacion.patch
node --test public/scripts/check-n1u1935f.mjs
node --test public/scripts/check-n1u1935c.mjs public/scripts/check-n1u1935d.mjs public/scripts/check-n1u1935e.mjs public/scripts/check-n1u1935f.mjs
```

Recargar con Ctrl+F5 y abrir Laboratorio → Articulaciones semánticas (`/#/lab/nucleos`). Abrir «19.3.5f · Consolidación filosófica y editorial». Verificar las cuatro propuestas, el sentido candidato, los 17 casos, las relaciones activas y una transición n05→n03. Revisar que las preguntas y el historial previos continúan funcionando. Si el parche no pasa `--check`, no forzarlo; comunicar la salida de Git.

Validación de esta entrega: seis pruebas automatizadas con datos de ensayo; prueba adicional del catálogo instalado omitida en el entorno de preparación (se cotejaron por separado las 17 referencias y seis transiciones contra el catálogo remoto). Aplicación/reversión comprobadas contra fragmentos exactos consultados del código, no contra un clon completo. No hay acceso a MariaDB activa ni comprobación de navegador real. Ningún archivo remoto fue modificado. No requiere migraciones SQL, dependencias nuevas ni créditos de LLM.

Reversión (solo si no se realizaron otros cambios sobre los mismos archivos): `git apply -R --check agora-n1u1935f-consolidacion.patch` y `git apply -R agora-n1u1935f-consolidacion.patch`.
