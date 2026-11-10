# Ágora · Laboratorio — Preguntas de control (etapa 1)

## Propósito

Observar **por qué** una pregunta activa determinados conceptos e intenciones antes de evaluar el texto de respuesta. Este parche extiende el **Inspector del motor** que ya existía; no duplica sus tablas de ranking ni crea un segundo chatbot.

Se compara la salida efectiva de `analyze()` con **cinco expectativas editoriales provisionales**. Los resultados están calculados en la interfaz al cargar el Inspector. El botón **Inspeccionar** ejecuta la pregunta real en `simulate()`, dejando visibles el diagnóstico de FAQ, los descartes, el margen, el plan y la vista previa ya ofrecidos por el laboratorio. La exportación JSON de una prueba guiada incluye `questionAudit`.

## Alcance y límites

- `public/js/lab/questionCases.js`: casos y evaluación pura, sin dependencias de MariaDB ni efectos secundarios.
- `public/js/views/labQuestionBench.js`: tabla de contraste que reutiliza CSS existente.
- `public/js/views/lab.js`: incorpora tabla y botón de inspección, reutilizando el flujo del inspector.
- `public/scripts/check-question-diagnostic.mjs`: test de regresión y de discrepancia intencional.
- `e2e/tests/preguntas-control.spec.mjs`: prueba de Chromium (escritorio y móvil) con la fixture de Playwright existente.
- `public/package.json`: `npm run test:questions`, y las verificaciones también se incluyen en `test:views`.

**No se cambian** `analyze.js`, `detect.js`, `bot.js`, FAQs, datos de MariaDB, traducciones o trayectos.

La comparación observa solo reconocimiento léxico e intención: un resultado de «Coincide» **no prueba** que la FAQ seleccionada, la respuesta o el trayecto sean correctos. El campo `primaryMode: null` expresa **criterio no fijado**, no la expectativa de que el motor no detecte un modo. Los términos que no aparecen como activadores no deben declararse «desconocidos para el bot completo»: otros mecanismos de detección pueden intervenir posteriormente.

## Resultado de referencia al preparar el parche

| Pregunta | Expectativa | Resultado de `analyze()` | Evaluación |
|---|---|---|---|
| ¿Qué es la naturaleza? | phusis / definir | phusis / definir | coincide |
| ¿Qué es la phýsis? | phusis / definir | sin concepto / definir | diverge |
| ¿Qué significa areté? | arete / definir | arete / definir | coincide |
| ¿Cómo se relacionan naturaleza y virtud? | phusis, arete / relacionar | phusis, arete / relacionar | coincide |
| ¿La felicidad es contemplación? | eudaimonia, theoria / modo pendiente | eudaimonia, theoria / sin modo | coincide en lo evaluado |

La discrepancia de `phýsis` está **documentada, no corregida**: será útil para evaluar la normalización y los sinónimos cuando discutamos el léxico.

## Cómo probar

Desde la carpeta `public`:

```sh
npm run test:questions
npm run test:views
```

Luego abrir `#/lab/motor` y pulsar **Inspeccionar** en una pregunta de control. En un PR, GitHub Actions ejecutará el nuevo caso de Playwright en escritorio y móvil. **Esa ejecución todavía no se ha realizado en este entorno**.

## Fase posterior: dos FAQ curadas

Mantener **separados** los criterios y resultados:

1. Identificación de la pregunta: forma, conceptos, modo y selección de FAQ.
2. Construcción del trayecto: nodos seleccionados, aristas, dirección, relaciones, referencias textuales, fuentes y voz editorial.
3. Justificación: por qué se aceptó una conexión y por qué se descartaron alternativas, tanto cuando el recorrido coincide como cuando diverge de la FAQ curada.
4. Resultado discursivo: calidad de la respuesta producida, **sin usarla como sustituto de la evaluación lógica**.

Las FAQ curadas no se importan ni se alteran en esta primera etapa. Sus trayectos tampoco se toman como una verdad mecánica que el motor deba copiar; serán casos de contraste editorial y discusión.

## Compatibilidad y verificación

El parche fue montado sobre una copia reconstruida de los archivos previamente compartidos, con las refactorizaciones del Laboratorio y de utilidades aplicadas. El HEAD remoto de GitHub no estuvo accesible desde este entorno. Antes de aplicarlo en otra versión, ejecutar `git apply --check` y validar la suite de Playwright del PR.
