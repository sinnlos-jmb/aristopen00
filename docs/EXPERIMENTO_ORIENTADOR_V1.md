# Laboratorio · Experimento 4: Orientador de consultas V1

## Propósito

Registrar cómo una inquietud inicial se convierte en consulta estructurada mediante aclaraciones sucesivas. La V1 no promete trayectos, no puntúa relaciones y no modifica el corpus.

## Ruta

`/#/lab/orientador`. El experimento tiene una vista independiente. Se mantiene dentro del proceso de navegación actual del Laboratorio sin modificar el Chat.

## Contrato

`iniciarOrientacion(texto)` reconoce términos léxicos con `analyze()` y ofrece una **hipótesis** de tema únicamente si encuentra exactamente un concepto. La intención detectada se conserva como dato de diagnóstico, pero no se atribuye automáticamente como deseo confirmado del usuario.

`siguientePregunta(sesion)` propone tema, intención, destino si se desea relacionar, nivel, extensión y origen. `responderOrientacion(sesion, valor)` valida la opción y produce una copia inmutable con su bitácora; no hay respuestas inventadas. `cerrarOrientacion(sesion, motivo)` acepta `conforme` o `abandonado`, incluso antes de completar todas las dimensiones. La conformidad se refiere **solo a la consulta**, no a un trayecto.

Las opciones `sin_preferencia` son elecciones explícitas; `null` significa no precisado. Cada evento registra un número de secuencia, datos de respuesta, consulta resultante y estado. La bitácora se exporta a JSON para analizar la génesis de las decisiones. Reiniciar inicia otra orientación; no hay persistencia automática deliberadamente en V1.

## Alcance y límites

- **No** se generan rutas, rankings ni scores. `candidatos` permanece vacío y `evaluacion` es `no_disponible_v1`.
- **No** se infieren preferencias a partir del vocabulario; una correspondencia léxica es una hipótesis, no un sentido confirmado.
- No se cambian `analyze()`, `detect()`, `planPath()`, las FAQ ni la base de datos.
- V2 conectará candidatos del grafo y FAQ; V3 añadirá priorización justificada, filtros y recuperación de alternativas.
- Las preguntas son deterministas en esta V1, no adaptativas de modo avanzado; se comprueba primero que la conversación sea auditable.

## Pruebas

Desde `public/`: `npm run test:views` o `npm run test:orientador`. En el CI de navegador, `e2e/tests/orientador.spec.mjs` cubre orientación, conformidad y abandono con datos simulados.
