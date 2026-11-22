# Ágora · N1-U.13 · Puerta de entrada pública a las fichas

## Objetivo

Promover la experiencia de fichas explicativas del Libro I a la navegación principal de Ágora **sin duplicar** la lógica editorial y sin modificar las tablas de MariaDB. El Lab continúa como entorno de prueba.

## Rutas

- `/#/fichas`: red de siete fichas.
- `/#/fichas/proemio`, `/etica`, `/bien`, `/felicidad`, `/ergon`, `/alma`, `/virtudes`: acceso compartible a una ficha.
- `/#/lab/arquitectura`: conserva el experimento con todos sus controles.

La ruta cambia en el navegador mediante `history.replaceState` al seleccionar una ficha o volver a la red; no se inicia de nuevo Cytoscape. Al abrir directamente una ruta, se selecciona la ficha mediante su ID editorial real, sin búsquedas por título.

## Qué se integra

1. Enlace «Fichas» en sidebar y breadcrumb.
2. Acceso destacado desde la portada, manteniendo el Lab en su propia sección.
3. Reutilización del grafo, inspector, fichas y subfichas, trayectos FAQ, respaldo estructural, preferencias y lector bilingüe ya existentes.
4. Un texto compacto para explicar ficha, subficha y FAQ, con enlace al Lab.

## Estado editorial y límites

- No se cambian preguntas, pasajes, relaciones ni traducciones.
- Las cuatro FAQ piloto siguen siendo **borradores**; no se publican trayectos ni se migran a MariaDB.
- La revisión del corpus y de los JSON propuestos se valida en el motor ya existente; si no coincide, la vista muestra el error editorial.
- Este incremento integra la **presentación**, no convierte los JSON experimentales en un nuevo repositorio editorial persistente. La migración controlada de las fichas a una fuente editorial estable queda para una fase distinta.
- El formato doble diacrónico/sincrónico permanece **pendiente** hasta después del primer piloto del Libro II.

## Prueba manual

1. Comprobar `/#/fichas` en el sidebar y acceder desde portada.
2. Seleccionar «¿Qué es la felicidad?»; debería actualizarse la ruta a `/#/fichas/felicidad` sin perder el zoom.
3. Copiar y abrir `/#/fichas/ergon` en otra pestaña; debe seleccionar el argumento del érgon.
4. Navegar entre fichas, respaldos estructurales, pasajes bilingües, controles tipográficos y guardar posiciones.
5. Abrir `/#/lab/arquitectura` para verificar que la experiencia experimental original sigue igual.
6. Si hay cambios en la revisión MariaDB, comprobar que la advertencia de incompatibilidad es visible.

## Validación

`node public/scripts/check-lab-arquitectura-n1u13.mjs` verifica la consistencia estática de rutas, catálogo, navegación y motor compartido. No sustituye una prueba de navegador con MariaDB activa.
