# Ágora · Checkpoint 8B — Controles flotantes y notificaciones

Incremento incremental sobre el **Checkpoint 8A**. No cambia datos, grafo semántico, MariaDB, Cytoscape ni contrato de persistencia.

## Qué cambia

- Botón **⚙ Controles**, sobre la esquina superior del lienzo de la **vista de focos**, abre un panel **no modal**. No desplaza el grafo ni bloquea la interacción con él.
- Tres pestañas compactas: **Nodos** (tipos, párrafos, ocultos, ramas conservadas), **Aristas** (etiquetas globales), **Vista** (guardar, recuperar, contraer, restaurar focos).
- El inspector lateral conserva la edición individual de títulos de aristas y las acciones de cada nodo.
- Teclas: `Escape` cierra el panel; `←`/`→`, `Inicio` y `Fin` cambian de pestaña cuando el foco está en la barra. El botón tiene `aria-expanded`, las pestañas `aria-selected`, y el panel no usa fondo bloqueante.
- Notificaciones temporales (2,8 segundos), **sin apilar**, solamente ante **guardado exitoso o fallido**, **agregar foco** y **quitar foco**. Los avisos de error no se confunden con confirmaciones. Las operaciones restantes siguen actualizando el estado textual.
- Reutiliza los **mismos IDs** de los controles de 8A; no altera el formato ni el nombre de la clave en `localStorage`. Se puede aplicar sobre disposiciones ya guardadas.
- CSS aislado en `public/css/lab-graph-controls-8b.css`, cargado únicamente por esta vista.

## Aplicación

```bash
git apply --check agora-visor-cytoscape-checkpoint8b-panel-toasts.patch
git apply agora-visor-cytoscape-checkpoint8b-panel-toasts.patch
node public/scripts/check-visor-controles-8b.mjs
node public/scripts/check-visor-visibilidad-8a.mjs
node public/scripts/check-visor-faq-grupos.mjs
node public/scripts/check-visor-titulos-aristas.mjs
node public/scripts/check-visor-disposiciones.mjs
```

## Prueba manual

1. Abrir `/#/lab/visor-grafos` y pulsar **Controles** sin desplazarse hacia arriba.
2. Con el grafo visible, en **Nodos** alternar tipos y párrafos; recuperar un oculto. Confirmar que no se modifica la posición de nodos conservados.
3. En **Aristas**, alternar la etiqueta global; seleccionar una arista e inspeccionar su título personalizado a la derecha.
4. En **Vista**, guardar la disposición. Confirmar el aviso breve. Recuperarla y comprobar que el layout 8A es compatible.
5. Añadir un foco desde la búsqueda y quitarlo con la × del chip; comprobar un solo aviso por operación.
6. Probar teclado, cerrar con `Escape` y verificar que el panel desaparece al pasar a **Resumen por tipos** o **Universo completo**.
7. Verificar un ancho de notebook y otro de móvil; el panel no debería tapar el inspector ni aumentar la altura de la página para operar los controles.

## Alcance y pendientes

No implementa deduplicación semántica; anotaciones enlazadas ni familias de disposiciones con variantes. Son temas para revisión posterior y requieren reglas independientes. Quedan registrados en `docs/LAB_VISOR_AGENDA_REVISION.md`. No ofrece sincronización entre dispositivos ni edición multiusuario.

La prueba automatizada comprueba las notificaciones y el contrato estático de controles. Falta la prueba visual en el navegador del usuario.
