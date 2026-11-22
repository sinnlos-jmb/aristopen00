# Ágora · N1-U.2 · Arquitectura argumentativa del Libro I

## Alcance

Nueva ruta experimental `/#/lab/arquitectura` dentro del catálogo del Lab. Usa el corpus de MariaDB **en tiempo de ejecución** (`GET /api/labo/lectura`). No modifica MariaDB, archivos editoriales ni la organización persistente del visor 9B.

Niveles del explorador: 4 macrounidades propuestas → 13 unidades de MariaDB → momentos (52 registrados, 14 propuestos para I–V) → 175 subunidades registradas. La selección abre una ficha lateral que muestra los resúmenes y las remisiones `mapa` registradas, distinguiéndolas de las relaciones filosóficas tipadas. Las subunidades permiten leer el capítulo original en griego y castellano mediante el motor de 9B, sin perder la selección del experimento al volver.

## Proveniencia

- `public/lab/n1u1-propuestas-libro-i.json` es la **hipótesis editorial del experimento**, procedente del documento N1-U.1, no un nuevo tagueo ni un corpus canónico. Incluye ID de revisión, 4 macrounidades, 14 momentos en I–V y la norma de traducción **«virtud completa en una vida entera»**.
- Unidades, subunidades, Bekker, textos introductorios, relaciones conceptuales, articulaciones de las restantes unidades: lectura en vivo de MariaDB.
- Las flechas `incluye` y `articula` representan solo pertenencia estructural. Las flechas `orden de lectura` son una **secuencia de capítulos**, no inferencias filosóficas. Las relaciones conceptuales de una subunidad se leen en su ficha y no se transforman en aristas entre subunidades.
- Si `revision` de la API no coincide con `fuente.revision` de la propuesta, el experimento **se niega a mezclar los datos** y explica la discrepancia. Exportar una nueva revisión y volver a auditar antes de editar la propuesta.

## Instalación

Aplicar sobre la rama con 9B instalado:

```powershell
git apply --check agora-lab-arquitectura-n1u2.patch
git apply agora-lab-arquitectura-n1u2.patch
```

No ejecutar `git apply` sobre el JSON original descargado. El parche instala una copia de la propuesta como recurso estático del experimento; no inserta nada en la base.

Abrir Ágora normalmente y entrar en **Lab → Arquitectura argumentativa** o navegar a `/#/lab/arquitectura`.

Si Cytoscape no está preparado, el inspector muestra las opciones navegables sin grafo; seguir las instrucciones del visor existente para crear `public/vendor/cytoscape.min.js`.

## Pruebas

```powershell
node public/scripts/check-lab-arquitectura-n1u2.mjs
node public/scripts/check-visor-lectura-9b.mjs
```

La primera prueba usa una **fixture reducida** bajo `public/scripts/fixtures` con la estructura, identificadores y articulaciones de la exportación del 19-11-2026, no la base de datos en vivo. Prueba cobertura total, 4 macrounidades, 13 unidades, 175 subunidades, 52 momentos registrados, 14 momentos propuestos, navegación y rechazo de revisión obsoleta / identificadores erróneos / asignación duplicada. No sustituye la prueba visual con MariaDB.

## Prueba manual recomendada

1. Abrir el experimento. Ver las 4 macrounidades y 3 flechas punteadas rotuladas **orden de lectura**.
2. Seleccionar **I–V**, luego **Proemio: el bien y la política**; los cuatro momentos aparecen con borde punteado (propuesta).
3. Abrir el momento **Fines de las acciones y pluralidad del bien**, seleccionar `1094a1-3`; inspeccionar movimientos y relación conceptual registrada; abrir lectura griego/castellano y volver.
4. Abrir **VI–VII → Crítica de la Idea del bien**; comprobar que los seis momentos proceden de la articulación **registrada** en MariaDB.
5. Mover un nodo y usar **Ajustar grafo**. Las posiciones pueden mantenerse durante la sesión del experimento, pero no se guardan en la disposición del visor principal ni en MariaDB.
6. Ejecutar las pruebas automatizadas y recorrer de nuevo el visor 9B para descartar regresiones.

## Reversibilidad

Mientras no haya cambios posteriores: `git apply -R agora-lab-arquitectura-n1u2.patch`. Los archivos, rutas y datos del experimento se eliminan sin tocar los checkpoints previos.

## Próxima revisión editorial

Revisar los 14 momentos propuestos de I–V; en particular, los títulos de Proemio y Método y la vinculación de las subunidades. No convertir las flechas del prototipo en aristas canónicas hasta acordar una tipología de relaciones entre unidades y subunidades.
