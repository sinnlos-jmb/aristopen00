# Checkpoint 5 — Relaciones entre focos y disposiciones persistentes

Incremento del visor de grafos posterior a **Checkpoint 4: identidad compartida**.

## Contrato

- Se resaltan las relaciones **existentes** que conectan directamente dos nodos foco: ambas orientaciones, sin inferencias.
- La etiqueta de esas aristas se muestra si el dato contiene `relacion` o `label` (fallback `tipo`).
- Casilla «Mostrar nombres de todas las aristas» para el resto y botón por arista en el inspector. Los cambios de visibilidad son locales al visor.
- El botón **Persistir ordenamiento** guarda coordenadas de nodos actualmente representados, los nodos previamente guardados, la selección de etiquetas y la casilla en `localStorage`; no guarda hasta que el usuario lo pide.
- La clave incorpora un conjunto canónico de focos (sin importar su orden) y una huella calculada de IDs/tipos/extremos/relaciones del grafo. No se recupera un layout si cambia esa estructura.
- Al reabrir la vista focal o restaurar un conjunto guardado se recuperan coordenadas y preferencias. Expansiones posteriores recuperan posiciones de nodos guardados incluso cuando no estaban en la vista inicial.
- El almacenamiento se limita a 30 conjuntos de focos por navegador y puede fallar sin interrumpir la exploración. No se sincroniza entre equipos ni usuarios.
- No se modifica el modelo editorial, la API, MariaDB ni el Orientador.

## Aplicación y comprobación

```bash

git apply --check agora-visor-cytoscape-checkpoint5-disposiciones.patch
git apply agora-visor-cytoscape-checkpoint5-disposiciones.patch
node public/scripts/check-visor-disposiciones.mjs
node public/scripts/check-visor-expansion.mjs
node public/scripts/check-identidad-visor.mjs
```

Abrir `/#/lab/visor-grafos`. Con focos `phusis`, `arete`, `eudaimonia`, comprobar que la relación funcional `arete → eudaimonia` aparece destacada con su nombre. Reubicar varios nodos manualmente, pulsar **Persistir ordenamiento**, cambiar el foco, volver a ese conjunto y verificar que las posiciones se recuperan. Expandir un vecino, moverlo y guardar; contraer y volver a expandir; la posición guardada debe volver. Verificar que una arista no focal admite nombre por selección individual.

## Límites

No se agrupan aún las FAQ ni se crean vínculos entre unidades y conceptos, tampoco se abre la lectura textual. Son incrementos posteriores. La posición final del layout inicial y el aspecto de etiquetas deben verificarse en el navegador con el corpus real.
