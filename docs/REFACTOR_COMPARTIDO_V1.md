# Ágora — consolidación mínima de utilidades compartidas (v1)

## Alcance

Parche incremental enfocado en duplicación comprobada. No cambia API, rutas, persistencia, trayectos, algoritmo del diálogo ni contenido editorial.

1. `public/shared/escape-html.js`: una función de escape HTML para la SPA, el Labo y Tagueo. Las tres API históricas `esc()` siguen exportándose desde sus `ui.js` respectivos. Tagueo ahora codifica también el carácter de comilla simple, evitando que se interprete como HTML si se usa en un atributo con comillas simples.
2. `src/utils/public-module.js`: un único adaptador Node para importar módulos ES ubicados dentro de `public`. Sustituye rutas `path.join + pathToFileURL + import()` repetidas en `shared.js`, `corpus-service.js` y `routes.js`. El adaptador rechaza rutas absolutas y `..`; solo los paths literales del propio código lo invocan.
3. `test/refactor/shared-modules.test.mjs`: tres pruebas que comprueban equivalencia de las exportaciones de escape, identidad de los módulos dinámicos y rechazo de rutas no permitidas.

## Qué NO resuelve

El backend **sigue dependiendo** de módulos puros situados bajo `public/`. Es un acoplamiento consciente que **no se elimina** en este parche: resolverlo requiere definir una ubicación estable para módulos de dominio compartidos y revisar sus consumidores. Tampoco se han mezclado las aplicaciones `/`, `/labo/` y `/tagueo/`.

## Validación disponible

```sh
node --test test/refactor/shared-modules.test.mjs
cd public && npm run test:views
```

Se comprobaron sintaxis y pruebas de módulo en una reconstrucción del proyecto a partir de los archivos facilitados anteriormente, incluida la refactorización del Laboratorio. La ejecución HTTP de GitHub Actions, los tests de integración contra la base `aristotle` y la comparación exacta con el HEAD remoto quedan pendientes.

## Orden aconsejado

1. Aplicar solo si `git apply --check` no encuentra diferencias.
2. Ejecutar pruebas del refactor y vistas; abrir PR para Playwright.
3. Una vez aprobado, continuar con la revisión del contenido: traducciones, terminología y referencias Bekker, sin tocar el modelo de trayectos.
