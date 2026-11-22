# Ágora · Agenda de revisión del grafo (después de 8B)

**Estado:** ideas de diseño registradas, **no implementadas**. No constituyen autorizaciones para fusionar datos ni cambiar relaciones filosóficas.

## R1. Dispersión y redundancia conceptual (revisión editorial prioritaria)

Ejemplos observados en el visor:

- Conceptos estáticos `vida` y `actividades y vida`.
- Formulaciones `fin y bien` / `bien y fin`, `fin`, `bien`, `bienes` y representaciones estáticas y funcionales afines.

No presuponer que una semejanza léxica es identidad filosófica. Elaborar inventario de posibles equivalencias, inclusiones, distinciones de sentido y solapamientos; mostrar fuentes y relaciones antes de aprobar cambios. Separar tres resultados: (a) duplicación real, (b) sentido o nivel diferente, (c) vínculo aún no registrado. Mantener los identificadores actuales mientras se audita; no usar ocultación visual como sustituto de la revisión.

## R2. Anotaciones en el grafo

Idea: recuadros explicativos conectados visualmente a un nodo o a una arista (o a varios elementos), desplegables y ocultables por el usuario. Considerar texto breve y ampliable, ancla visual estable por ID, procedencia y voz explícitas, indicador de nota del usuario frente a dato editorial, persistencia asociada a la disposición. **Una anotación no debe convertirse en una arista filosófica nueva ni modificar la relación original.** Explorar cómo evitar que esos recuadros saturen la vista.

## R3. Familias de grafos por centro focal

Idea: colecciones temáticas con una **base focal reconocible**, más variantes optativas. Ejemplo: base `phusis–arete–eudaimonia`, variantes `+theion`, `+polis` y otras. La base y cada variante pueden guardar posiciones, visibilidad de aristas y nodos, anotaciones y criterios didácticos sin multiplicar entradas indistinguibles en el catálogo.

Estudiar nombres, búsqueda, versionado y relación base→variante; decidir explícitamente qué estado se hereda y qué estado pertenece a cada variante. **El Checkpoint 8B sigue guardando disposiciones por conjunto exacto de focos y huella del grafo; no crea todavía familias.** Evitar una migración automática que altere disposiciones ya guardadas.

## Orden posible

1. Cerrar 8B y validar interacción en notebook.
2. Revisar R1 semánticamente antes de una función automática de sugerencias de equivalencia.
3. Diseñar R3 junto con la persistencia actual, con migración reversible.
4. Diseñar R2 como presentación y anotación explícita, separado del corpus.

No hay implementación, migración de MariaDB ni cambios del Orientador en esta agenda.
