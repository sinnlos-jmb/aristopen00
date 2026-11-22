# Checkpoint 2 — Exploración focal expandible (Cytoscape.js)

## Propósito

Antes de comparar bibliotecas de visualización, probar una interacción coherente y reutilizable sobre el visor de Cytoscape del Checkpoint 1. No se toca MariaDB, el Orientador, la proyección semántica, las relaciones del corpus ni la elección futura de visor.

## Contrato: base permanente y expansiones

- Abre con tres focos: `concepto_estatico:phusis`, `concepto_estatico:arete`, `concepto_estatico:eudaimonia` (si existen; en caso contrario se seleccionan los nodos disponibles).
- La **base** contiene todos esos focos y todas las aristas originales entrantes o salientes de cada uno, junto con sus extremos. No se agregan aristas entre vecinos por simple proximidad. Los vecinos compartidos por dos o más focos se distinguen con borde violeta.
- Un **doble clic sobre un vecino** añade todas sus aristas incidentes (y los extremos) a la vista. Otro doble clic las contrae. Se pueden expandir nodos introducidos por expansiones previas.
- Plegar un nodo elimina de la vista únicamente aristas y nodos que ya no pertenezcan a la base ni sean accesibles por otra rama expandida. Si una rama hija deja de estar visible, también se olvida su estado de expansión.
- Los focos siempre son permanentes; su doble clic no elimina las aristas base. Se pueden sustituir o ampliar mediante el buscador o el inspector, hasta cinco focos. Cambiar focos reinicia las expansiones.
- No se eliminan nodos ni aristas del corpus. Es un filtro de **presentación**, no una poda editorial ni una inferencia filosófica.

## Diseño y zoom

- La selección de cualquier nodo o arista se explica en un **panel lateral** (en pantallas estrechas, el panel pasa debajo del grafo).
- Sensibilidad de rueda `wheelSensitivity: 0.9` (antes `0.23`) y botones ± con factor `1.6`; botón «Ajustar vista».
- La actualización incremental mantiene las posiciones de nodos que permanecen visibles y sitúa los recién descubiertos cerca de vecinos ya visibles. No reinicia el layout a cada expansión.
- Los otros modos del Checkpoint 1 (resumen por tipos, universo completo) siguen disponibles para comparación; allí el doble clic oculta visualmente un nodo, restaurable con el botón correspondiente.

## Validación

```bash
node public/scripts/check-visor-generico.mjs
node public/scripts/check-visor-expansion.mjs
npm --prefix public run test:views
```

Después, abrir `/#/lab/visor-grafos` con el servidor y el bundle local de Cytoscape ya instalados. Verificar la expansión de un vecino compartido por dos focos, plegarlo, repetir en un nodo profundo y comprobar que el inspector permanece visible a la derecha en notebook.

## Limitaciones deliberadas

- No se habilita todavía el selector de biblioteca visual, Relate/Cypher, la persistencia de marcas didácticas ni el reconocimiento de roles.
- En un grafo con alta densidad, expandir un nodo puede agregar muchos elementos. El usuario puede plegarlo o usar «Contraer todas las expansiones». Una futura iteración puede incorporar cupos y paginación por tipo de relación, pero nunca ocultar resultados sin indicarlo.
- La posición incremental es aproximada; el checkpoint sirve para comparar *comportamientos de navegación*, no aún layouts sofisticados.
