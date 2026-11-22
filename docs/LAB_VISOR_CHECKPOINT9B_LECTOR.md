# Ágora · Checkpoint 9B — Lector contextual del Libro I

Aplicar después de 9A.2. Incremento sin migración de MariaDB ni cambios en el formato de los grafos guardados.

## Funcionamiento

1. Abrir el visor (`/#/lab/visor-grafos`), seleccionar un concepto o arista y **Mostrar unidades relacionadas**.
2. Expandir una unidad, seleccionar una subunidad y pulsar **Leer pasaje griego / castellano** en el inspector.
3. Dentro del **mismo modal** se ve el capítulo completo, con los tramos de la subunidad resaltados cuando `App.getLibrary().passages[subId]` contiene anclas válidas. No se abre un segundo diálogo.
4. Navegar entre capítulos del mismo libro usando los botones y el selector. Los capítulos ajenos al pasaje se muestran completos pero **sin resaltado**.
5. **Volver al grafo textual** devuelve al explorador original manteniendo posiciones, agrupadores, selección de focos y expansiones. El acto de leer no guarda ni cambia la disposición.
6. Cerrar el modal con × o Escape sigue funcionando; el lector se reinicia al cerrar.

## Fuente de verdad y límites

Se reutiliza `public/js/reader/text.js` (`buildLibrary`, `findAnchor`) y `public/js/reader/render.js` (`renderChapter`, `chapterNavigation`). No se utiliza el tag de párrafo ni un solapamiento Bekker aproximado como sustituto de anclas no localizadas.

- Sin anclas válidas en ambas lenguas: se informa que la subunidad no pudo localizarse; no se inventa un pasaje.
- Una sola lengua localizada: se destaca solo esa lengua y se informa que la otra no tiene resaltado exacto.
- La fuente de lectura disponible en esta fase es la biblioteca de Ágora del **Libro I**. No intenta navegar libros ni comentaristas todavía no incorporados.
- Las referencias textuales conservan su procedencia; la lectura no acredita nuevas relaciones filosóficas.
- Los botones y la estructura del Lab de pasajes quedan para checkpoints posteriores.

## Pruebas

```bash
node public/scripts/check-visor-lectura-9b.mjs
node public/scripts/check-visor-texto-9a2.mjs
node public/scripts/check-visor-contexto-9a1.mjs
node public/scripts/check-visor-disposiciones.mjs
npm --prefix public run test:views
```

Prueba manual con MariaDB real: desde *areté*, abrir dos subunidades, desplazarse a otro capítulo y regresar; comprobar que los resaltados cambian solo en el capítulo original y que las posiciones del explorador sobreviven al regreso. Repetir con una subunidad sin ancla exacta y observar un aviso, no una selección inventada.

## Siguiente decisión editorial

Después de 9B y antes de cerrar FAQ/trayectos, efectuar un **inventario y auditoría de nombres** de conceptos, unidades, subunidades y relaciones: identificar duplicaciones, títulos compuestos que podrían ser relaciones, consistencia de verbos para aristas y distinción entre nombre editorial e alias visual. No renombrar identificadores ni reescribir etiquetas de Libro I sin una tabla de correspondencias y aprobación editorial. Aplicar la misma política al comenzar Libro II.
