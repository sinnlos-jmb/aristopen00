# Ágora · Orientador V2, incremento 1

## Alcance

Este incremento reconoce la forma de la pregunta inicial **sin sustituir la decisión del estudiante**. Las hipótesis de interpretación quedan separadas de `consulta` (decisiones confirmadas), del corpus editorial y de las aristas verificadas.

- Multiplicidad: `distinguir` preserva tres o más conceptos y genera pares solicitados, **sin inventar aristas**, direcciones ni causalidad.
- Preguntas evaluativas: «mejor de las virtudes» activa `evaluar`, señala que falta criterio y no convierte el adjetivo «mejor» en el concepto independiente `ariston`.
- Definición/cualidad y génesis/justificación: distingue la operación pedida de la acepción conceptual.
- Sentido libre: el estudiante puede precisar su uso del tema; se registra con procedencia `texto_estudiante` en bitácora y, si da consentimiento, en `consulta_json` de `user_queries`. No se publica como definición editorial.
- Persistencia: amplía opcionalmente el JSON existente; **no requiere migración**. La V1 anterior sigue aceptándose.
- `definicionesDisponibles(S, id)` prepara la recuperación de definiciones con identidad editorial desde `S.DEFC`; no fabrica definiciones ni asigna automáticamente una al estudiante.

## Límites

El QuerySpec de V1 aún tiene un solo `tema` y un solo `destino`. Las parejas de una comparación múltiple viven en `interpretacion.relacionesSolicitadas`, **no** en un grafo comprobado. No se construyen trayectos ni se emite un ranking. Los sentidos documentales y la pregunta de aclaración sobre un criterio evaluativo quedarán para el siguiente incremento.

## Pruebas

Desde `public`: `npm run test:orientador`. Desde la raíz: `node --test src/test/user-queries.test.mjs` o `node src/test/user-queries.test.mjs` según el runner disponible. Abrir `/#/lab/orientador` para validar el flujo manual y el registro. Playwright cubre ambos casos en `e2e/tests/orientador-sentidos-v2.spec.mjs`.
