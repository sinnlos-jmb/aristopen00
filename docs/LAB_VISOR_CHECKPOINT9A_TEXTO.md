# Ágora · Checkpoint 9A — Navegación contextual hacia unidades y subunidades

## Propósito

Vincular el grafo conceptual de solo lectura con la estructura textual **ya existente** en `App.S`, sin incorporar de golpe párrafos al grafo ni convertir asociaciones editoriales en pruebas de una tesis filosófica.

Se mantiene la distinción entre **identidad del concepto**, **relación filosófica**, **indexación textual** y **decisión de visualización**. El corpus sigue siendo responsabilidad de MariaDB y `/api/contenido`; este módulo no escribe en la base.

## Uso

1. Abrir `/#/lab/visor-grafos` y mantener **Vista de focos**.
2. Seleccionar un concepto o una arista funcional, abrir el inspector derecho y elegir **Explorar texto de Aristóteles**. También se admiten FAQ cuando su nodo individual está visible.
3. Aparece el agrupador `Texto de Aristóteles (N)`, unido visualmente a la selección. Doble clic sobre el agrupador para desplegar unidades. Inicialmente se presentan hasta **seis** unidades; desde el inspector del agrupador puede habilitarse la lista completa.
4. Doble clic sobre una unidad para desplegar **solo las subunidades con vínculo explícito**. El inspector de la unidad explica la procedencia y permite **Mostrar todas como contexto**, con advertencia explícita de que no tienen todas el mismo tipo de evidencia.
5. Seleccionar una subunidad para consultar su ID y tramo Bekker. El lector con griego/traducción y resaltado corresponde al futuro **Checkpoint 9B**.
6. **Persistir ordenamiento** guarda también el ancla textual, unidades desplegadas y coordenadas de los nodos de navegación. Recuperar devuelve el último estado de la variante focal. Ningún alias editorial se modifica (eso corresponde a 9C).

## Contrato de procedencia

- `concepto_clave`: una subunidad identifica expresamente el concepto en `conceptos_clave`.
- `extremo_relacion_editorial`: una relación de subunidad usa el ID exacto del concepto como extremo `de` o `a` (no se interpreta texto libre como identificador).
- `destino_arista_funcional`: un destino de una relación de subunidad identifica explícitamente la misma arista funcional por su ID editorial **estable**. El ID de Cytoscape `vinculo:N` no se confunde con ese ID.
- `tag_parrafo_contexto_unidad`: un párrafo etiquetado pertenece a una unidad. **NO** se distribuye esa etiqueta entre todas las subunidades de la unidad.
- `pasaje_faq_subunidad` y `pasaje_faq_unidad`: se resuelven solamente los IDs existentes; `u:xxx` representa una unidad si `xxx` existe en el bundle. No se deducen rangos Bekker o coincidencias parciales.
- `contexto_unidad_no_evidencia_directa`: todas las subunidades de una unidad pueden abrirse voluntariamente, pero no se presentan como evidencia propia de la selección.

Los nodos `texto:*` y aristas `navegacion_textual_visual` pertenecen exclusivamente a la visualización. No alimentan los algoritmos de vecindad conceptual, no se exportan a la proyección Cypher ni modifican el grafo editorial. Para una arista seleccionada, se usa un anclaje visual auxiliar sin convertir la arista original en un nodo filosófico.

## Límites deliberados

- No se presenta texto completo ni se resalta una subunidad: **9B** incorporará el lector contextual y verificará la granularidad de las anclas textuales.
- No se permiten aún títulos personalizados para unidad/subunidad: **9C** los guardará como alias de presentación, sin renombrar registros.
- No se construyen relaciones nuevas desde mera similitud léxica, coaparición de tags o pertenencia a una unidad.
- Si una arista funcional no tiene destinos textuales explícitos, se indica que no existe ese enlace en el conjunto consultado; no se inventa un pasaje a partir de su referencia general.
- Los agrupadores se muestran bajo demanda. El máximo inicial de seis unidades protege la vista en notebooks. Las subunidades no aparecen salvo doble clic.

## Pruebas

```sh
node public/scripts/check-visor-texto-9a.mjs
node public/scripts/check-visor-visibilidad-8a.mjs
node public/scripts/check-visor-disposiciones.mjs
node public/scripts/check-visor-faq-grupos.mjs
node public/scripts/check-semantic-explorer.mjs
```

Prueba manual: inspeccionar `arete` y, por separado, una arista como `arete → eudaimonia`; comprobar que la lista de unidades **puede ser diferente** porque la primera se apoya también en índices conceptuales, mientras que la segunda requiere destinos textuales explícitos. Abrir y cerrar unidades, guardar, recuperar y verificar que las ramas y FAQ del Checkpoint 8A siguen intactas.

## Orientaciones para el Libro II y el aula (no implementadas)

1. **Libro II**: migrar o ajustar el contrato común de tags, sentidos y relaciones para ambos libros, en vez de sostener dos esquemas. Antes de generar índices textuales nuevos, definir una identidad estable de pasaje por obra/libro/localización; el `parrafo_nro` del Libro I no debería convertirse en identificador universal.
2. **Variantes de clase**: una secuencia de disposiciones guardadas puede servir como guion de exposición, heredando el centro focal y cambiando nodos, posiciones y anotaciones. Debe conservarse la separación entre evidencia compartida y composición particular del docente. La interfaz de presentación y las familias/variantes serán checkpoints independientes.
