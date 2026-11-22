# Checkpoint 3 — Visibilidad semántica del visor

El visor continúa en modo experimental y no modifica el corpus de MariaDB. Cytoscape recibe la misma proyección documental, filtrada únicamente para la **presentación gráfica**.

## Convenciones

- **Conceptos estáticos**: primera preferencia en los resultados de búsqueda, sin excluir los funcionales.
- **Nodos funcionales**: no se eliminan; sus remisiones y aristas siguen navegables. Botón «Ver nodos funcionales» y contador para comprobarlos.
- **FAQ**: no se ocultan mediante el filtro de categorías didácticas, y se muestran cuando tienen relación con el conjunto visible.
- **Subunidades**: no se dibujan en este checkpoint, pero permanecen en la proyección y en las exportaciones documentales.
- **Párrafos**: por defecto se muestran solamente si un párrafo conecta directamente al menos dos focos seleccionados; el checkbox añade todos los demás párrafos al grafo navegable. El checkbox nunca elimina los párrafos puente.
- **Zoom**: rueda más sensible; botones con factor 2,1. No afectan el modelo.
- **Expansión/colapso**: conserva la semántica del Checkpoint 2. Cuando cambian los focos o el filtro de párrafos, se reconstruye el índice gráfico sobre la misma proyección original.

## Comprobaciones

```bash
node public/scripts/check-visor-expansion.mjs
node public/scripts/check-visor-filtros.mjs
npm --prefix public run test:views
```

Probar: cargar los tres focos; contar los nodos funcionales visibles; buscar `phusis`, pulsar «Ver nodos funcionales», añadir uno como foco; activar/desactivar párrafos; expandir/contraer; comprobar que las FAQ pertinentes siguen presentes. En «Universo completo» las subunidades siguen fuera de la vista; no se borran datos.

## Límite pendiente

Las conexiones indirectas entre un foco funcional y un párrafo que refiere a su equivalente estático **no cuentan** como puente directo. No se inventa identidad entre las dos clases de nodo. El concepto de «párrafo relevante» podrá evolucionar editorialmente.
