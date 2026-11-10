# Laboratorio: evidencia editorial (etapa 2)

## Propósito

Diagnosticar **qué datos editoriales respaldan la inclusión de pasajes candidatos** después de que el detector reconoce conceptos, y distinguir ese índice de un trayecto efectivamente elegido. No altera `analyze()`, FAQ, `planPath()`, el Chat ni MariaDB.

## Cómo utilizarlo

1. En `/#/lab/motor`, seleccionar «¿Qué es la naturaleza?» en **Preguntas de control**.
2. Abrir **Evidencia editorial · etapa 2** después de **Plan real del diálogo**.
3. Si el bot está esperando una aclaración (plan de 0 pasos), los pasajes son candidatos extraídos de `sub.conceptos_clave`, **no decisiones del planificador**.
4. Desplegar cada pasaje: se ven unidad, momento si existe, conceptos coincidentes, movimientos y códigos editoriales de voz del texto.
5. Los tags, sus **sentidos**, niveles e implicitud se muestran como **contexto de los párrafos que pertenecen a la unidad**. No se asignan arbitrariamente a una subunidad.
6. Se exportan en el JSON del Inspector bajo `evidenceAudit`; el campo `vinculoTagSubunidad: "no_acreditado"` hace explícito el límite de granularidad.

## Qué sí y qué no demuestra

Una coincidencia en `conceptos_clave` **justifica la recuperación documental preliminar**. No acredita que el tag de párrafo corresponda al rango Bekker específico, ni establece una inferencia entre conceptos, ni una prioridad filosófica.

Cuando existe un plan, los pasajes se identifican como `plan_real`, pero **eso tampoco demuestra que cada transición esté justificada**. La inspección de aristas, sus voces y sus recorridos inversos será una etapa posterior.

Las preguntas que no detectan ningún concepto (como la discrepancia `phýsis`/`physis` de la primera etapa) siguen sin candidatos. El léxico permanece deliberadamente intacto.

## Procedencia y cobertura

Datos cargados por la aplicación desde `/api/contenido`, con `S.SUB`, `S.U`, `S.MOM` y `S.TP` construidos por `buildStore()`. Si una unidad no trae tags de párrafo, se informa la ausencia de evidencia, **no** la ausencia del concepto. No se importa `tags_v4.json` histórico a la aplicación ni se altera el corpus actual.

## Pruebas

Desde `public/`: `npm run test:views` (incluye `check-evidence-audit.mjs`).

Desde `e2e/`: `npm test` (Playwright y fixture de API; no escribe en MariaDB). La prueba E2E específica es `tests/evidencia-editorial.spec.mjs`.

## Siguiente decisión editorial

Contrastar por separado: reconocimiento del término, desambiguación de sentido, pertinencia del pasaje y justificación de cada arista. Las FAQ curadas aportarán recorridos de referencia, pero **no serán rutas únicas obligatorias**.
