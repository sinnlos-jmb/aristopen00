# Ágora · Contrato provisional de tagueo — checkpoint de identidad (V1)

**Propósito.** Establecer convenciones reproducibles para continuar el etiquetado de la *Ética nicomáquea*, revisar el Libro I y evitar que el visor introduzca identidades o relaciones que el corpus no afirma.

**Estado:** documento de trabajo, no migración ni cambio del criterio filosófico. No modifica los esquemas de MariaDB. Los siguientes capítulos se deben trabajar con el validador existente (`public/tagueo/js/validar.js`) **más** el auditor nuevo. Ninguno reemplaza la lectura editorial.

## 1. Cuatro nociones que no debemos confundir

| Noción | Representación existente | Qué afirma | Qué NO afirma |
|---|---|---|---|
| Identidad conceptual | Igual `id` en árbol estático y funcional | Dos facetas del mismo concepto | Identidad de sus definiciones o de sus jerarquías |
| Remisión editorial | `funcional[n].remite_a` → `concepto` o `concepto#sentido` | El nodo funcional remite deliberadamente al concepto/sentido | Equivalencia filosófica o arista causal |
| Relación explícita | Arista funcional `de`→`a` con `rel`, `voz`, `ref`; o `subunidad.relaciones` | Hay una relación registrada con procedencia editorial | Que pueda invertirse o que la voz sea siempre Aristóteles |
| Asociación de tag | `parrafos[].conceptos[]` y `subunidad.conceptos_clave[]` | Un concepto es pertinente al párrafo/subunidad en el nivel indicado | Que el texto respalde cualquier relación entre todos los tags |

**Identificador canónico:** utilizar el ID existente del estático (ej. `phusis`, `arete`) cuando se trata del mismo concepto; el visor puede mostrarlo como una sola ficha con facetas estática y funcional. Conservar cada fuente original y sus propiedades. No materializar nodos equivalentes por similitud de etiqueta, coincidencia griega o vecindad.

**Nodo funcional propio:** si se introduce una función o categoría que no es el mismo concepto, asignarle un ID propio y usar `remite_a` solo cuando exista un referente específico. `remite_a` no se requiere para los conceptos que ya comparten ID. `#sentido` identifica una ficha editorial concreta del estático. No inferir esa ficha por coincidencias léxicas.

## 2. Antes de taguear un nuevo pasaje

1. **Identificar el pasaje** con libro, capítulo, referencia Bekker, versión del texto griego y traducción. Conservar siempre el segmento griego efectivamente utilizado como ancla.
2. **Reutilizar conceptos existentes** antes de crear nuevos IDs. Verificar la ficha estática, su jerarquía y sus sentidos. Si el sentido cambia, revisar si basta una ficha `sentidos[]` o si realmente hay otro concepto.
3. **Anotar conceptos por párrafo:** cada tag conserva `c` (ID estático), `s` opcional (ID de sentido exacto) y `n` (`central`, `presente`, `mencion`). Usar `central` para un eje interpretativo del pasaje, `presente` para una presencia relevante, `mencion` para alusión marginal. No utilizar `n` como puntaje didáctico del futuro visor.
4. **Distinguir lo implícito de lo expreso:** cuando corresponda `implicito: true`, mantener la justificación editorial. Según el validador actual, si se utiliza `via`, entonces debe haber también `ref` y `implicito: true`; no es obligatorio agregar `ref` a todos los implícitos sin `via`.
5. **Separar voz y procedencia:** `textual` no equivale a `nuestra`; registrar como lectura nuestra lo que no afirma directamente el pasaje. Una nota con voz contextualiza un tag, pero no lo convierte en una arista funcional.
6. **Estructurar unidades/subunidades:** indicar rangos `bekker`, anclas griega y castellana (`gr_ancla`, `es_ancla`), `conceptos_clave` y relaciones de subunidad. Estas relaciones admiten extremos de texto libre; no convertirlos automáticamente en IDs de concepto.
7. **Vincular evidencias precisas:** las relaciones de subunidad pueden incluir `destinos` con `ref`, arista funcional (`arista`) o `hacia.faq`. Conservar el vínculo documentado y verificar sus referencias. No suponer que los tags del párrafo se aplican automáticamente a cada subunidad de su unidad.
8. **Estado editorial:** `propuesto`, `discusion` o `confirmado` representan estados diferentes. La ausencia de errores de estructura NO cambia el estado de un tag ni confirma su validez filosófica.

### Ejemplo de formato existente (ilustrativo, no una nueva anotación)

```json
{
  "parrafo": 1,
  "estado": "propuesto",
  "conceptos": [
    {"c": "agathon", "n": "central"},
    {"c": "techne", "s": "amplio", "n": "presente"}
  ]
}
```

El atributo `s` debe existir realmente en la ficha `sentidos` de ese concepto. El auditor comprueba esa consistencia pero no verifica si el sentido elegido es filosóficamente apropiado al pasaje.

## 3. Criterios de revisión del Libro I

**Errores estructurales (bloqueantes para aprobar el checkpoint):** IDs duplicados en una misma estructura; `remite_a` a concepto/sentido inexistente; arista funcional a nodo inexistente; tag a concepto/sentido inexistente; concepto clave de subunidad sin ficha estática; destino hacia arista o FAQ inexistente; referencias de párrafo asignado a unidad sin registro de tags; `via` sin `implicito` o sin referencia. Estos casos se detectan automáticamente con el auditor y/o el validador existente.

**Revisión editorial (no bloqueante automáticamente):** discrepancias de términos griegos entre fichas compartidas; funcional propio sin remisión; tags repetidos para un mismo sentido; elección de nivel `central/presente/mencion`; conceptos implícitos; `sentidos` que agrupan acepciones distintas; correspondencia entre voz textual y una afirmación; vínculos demasiado generales o excesivamente específicos. Leer el pasaje antes de corregir.

**Cobertura:** comprobar distribución de niveles, estados y sentidos por capítulo; cantidad de conceptos nuevos/reutilizados; relaciones explícitas citadas frente a relaciones solo inferidas; fragmentos sin anclas o con anclas rotas (según el validador existente). Comparar contra un informe de referencia después de cada capítulo, pero nunca fijar recuentos históricos como umbral universal.

**Orden de revisión:** primero referencias rotas → identidad y sentido → anclas textuales → voz/procedencia → relevancia del tag → evaluación didáctica. El orden evita marcar como redundantes relaciones que aparecen duplicadas solo por un fallo de integración.

## 4. Contrato para el visor (sin implementación todavía)

- **Nodo canónico:** `concepto:<id>` con propiedades `estatico` y/o `funcional` y referencias a los registros de origen.
- **Aristas visibles por defecto:** jerarquías estáticas y aristas funcionales, con tipo, voz, dirección y fuente preservados. Las jerarquías estática y funcional NO se sustituyen entre sí.
- **Tags y subunidades:** índices documentales consultables desde el inspector; no producir a partir de ellos nuevas aristas filosóficas.
- **Párrafos:** agrupar por unidad; mostrarlos únicamente por acción del usuario y conservando su carácter contextual.
- **FAQ:** puntos de entrada didáctica, con foco que puede ser estático o funcional, no necesariamente ambos.
- **Poda didáctica:** será una tabla editorial independiente por foco y nodo, jamás una eliminación ni alteración del grafo original.

## 5. Preparación para capítulos/libros posteriores

**Advertencia de compatibilidad:** varias rutas y formatos actuales están especializados en el Libro I:

- `public/tagueo/js/texto.js` identifica párrafos principalmente por `parrafo_nro`, sin clave de libro en `S.P`.
- `tags.mapa.libro_tagueado` selecciona un libro para el modelo actual.
- `src/labo/corpus-core.js` construye referencias `EN I` y un alcance `en1` específico.

Por tanto, **no ampliar todavía el corpus a otros libros copiando sin cambios los números de párrafo**. Antes de iniciar el Libro II, definir una identidad textual estable, por ejemplo `(obra, libro, parrafo_local)` o un ID global, y un mecanismo de anclas Bekker que preserve la compatibilidad del Libro I. Generalizar el alcance y las referencias `EN I` en el constructor del corpus con una migración planificada y pruebas de regresión. Este checkpoint NO realiza esa migración.

## 6. Ritual de checkpoint

1. Capturar el bundle publicado del corpus; identificar su versión/revisión.
2. Ejecutar el validador de tagueo existente y el auditor de identidad.
3. Corregir errores estructurales sobre una copia/edición controlada; no modificar los datos desde el auditor.
4. Revisar editoralmente los hallazgos `revision` leyendo el griego, traducción y Bekker.
5. Registrar las decisiones de reinterpretación (qué se modificó, por qué, evidencia, autor/revisor cuando exista administración).
6. Conservar el JSON de auditoría como línea base y comprobar que no aparezcan regresiones al añadir un capítulo.

**Criterio de aprobación:** cero errores estructurales conocidos, todas las revisiones importantes triadas (pueden quedar justificadamente pendientes), y trazabilidad al texto en las interpretaciones críticas. No exige cero observaciones semánticas.
