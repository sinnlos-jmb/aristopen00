# Ágora · Checkpoint 9A.1 — Explorador textual contextual

## Propósito

El grafo conceptual y la consulta documental ocupan ahora **dos espacios independientes**. En 9A la misma unidad/subunidad se insertaba en el grafo principal; sus coordenadas resultaban incoherentes al consultarla desde distintos conceptos. En 9A.1 las unidades y subunidades **no se incorporan nunca** al Cytoscape principal.

Al seleccionar un concepto, una FAQ individual o una arista funcional con vínculos textuales y elegir **Mostrar unidades relacionadas**, se abre un diálogo grande con **otro Cytoscape**. Tiene **un único nodo central**, que identifica el elemento seleccionado, y unidades conectadas mediante vínculos **visuales** de navegación documental. No se generan relaciones filosóficas nuevas.

## Interacción

1. Abrir `/#/lab/visor-grafos`, vista focal. Seleccionar un concepto y pulsar **Mostrar unidades relacionadas** en su inspector lateral.
2. El modal muestra ese concepto como único centro, hasta **seis unidades vinculadas** y un inspector propio. Si hay más de seis unidades, elegir **Mostrar todas**.
3. Doble clic sobre una unidad para expandir/contraer las subunidades **con vínculo propio acreditado**. El inspector de unidad permite también **Incluir todas como contexto**. Los tags de párrafo solo generan asociaciones de contexto de unidad; nunca se adjudican automáticamente a cada subunidad.
4. Seleccionar una subunidad para ver su ID, tramo Bekker y tipo de procedencia. **9B** incorporará lectura y resaltado; no se simula un texto completo.
5. Cerrar con **Escape** o **Cerrar ×**. El grafo principal conserva exactamente su disposición.
6. Pulsar **Controles → Vista → Persistir ordenamiento** para guardar también las posiciones/expansiones del explorador textual. Esta acción sigue siendo explícita.

## Persistencia y migración

- Se conserva la misma clave de almacenamiento `agora.lab.visorgrafos.layouts.v1` y los campos anteriores de posiciones, títulos y etiquetas.
- El campo nuevo `exploradoresTexto` almacena estados aislados por **tipo y ID de ancla**, dentro de cada conjunto de focos. Una unidad puede ocupar posiciones distintas si se consulta desde `concepto:arete` o `concepto:eudaimonia`, sin duplicar su identidad editorial.
- Se conservan los estados antiguos `texto` del checkpoint 9A como datos de compatibilidad. **No se reabre automáticamente** una capa textual antigua dentro del grafo principal, ni se migran sus coordenadas a ciegas.
- El explorador textual recoge las posiciones al cerrar. Hasta pulsar **Persistir ordenamiento**, los cambios solo se mantienen en la sesión de la vista.
- Limites de seguridad: hasta 32 contextos y 250 posiciones por contexto en una disposición normalizada, además de los límites anteriores de almacenamiento.

## Procedencia: misma semántica que 9A

Se reutiliza `buscarVinculosTextuales` sin modificar sus reglas:

- `concepto_clave`: correspondencia directa de subunidad.
- `extremo_relacion_editorial`: extremo conceptual registrado en una relación de subunidad.
- `destino_arista_funcional`: referencia explícita a ID editorial de arista funcional, nunca a su ID visual `vinculo:N`.
- `pasaje_faq_unidad` / `pasaje_faq_subunidad`: referencia explícita válida.
- `tag_parrafo_contexto_unidad`: asociación a una unidad, **no evidencia atribuible a sus subunidades**.
- `contexto_unidad_no_evidencia_directa`: incorporación manual de las demás subunidades de la unidad.

El grafo principal sigue siendo de solo lectura respecto del corpus. MariaDB, el Orientador y las estructuras del tagueo no se modifican.

## Pruebas

```sh
node public/scripts/check-visor-contexto-9a1.mjs
node public/scripts/check-visor-texto-9a.mjs
node public/scripts/check-visor-visibilidad-8a.mjs
node public/scripts/check-visor-disposiciones.mjs
node public/scripts/check-visor-controles-8b.mjs
```

Prueba manual recomendada: abrir una misma unidad desde dos conceptos distintos, moverla en cada explorador y guardar por separado. Verificar que las posiciones no se mezclan, que el grafo principal conserva sus coordenadas, que Escape cierra el modal y que el botón Recuperar ordenamiento devuelve los datos guardados.

## Deliberadamente pendiente

- **9B:** lector con griego, traducción y resaltado fiable de anclas en el contexto de capítulo/libro.
- **9C:** Lab de pasajes y recuperación vectorial explicable desde el corpus actual.
- **9D:** selección y anotaciones por variante y ancla, alias personalizados de unidad/subunidad.
- Sin pestañas inactivas ni migraciones destructivas de las disposiciones existentes.
