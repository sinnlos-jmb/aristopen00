# Ágora · N1-U.17.3 · Prompt con dos salidas: explicación y evaluación editorial

## Problema que abordamos

Las respuestas demasiado cautelosas de `agora.llm.prompt.v1` se limitaban con frecuencia a decir qué frases no aparecían en el pequeño conjunto de citas, en vez de explicar la relación conceptual que preguntaba el lector. El usuario presentó ejemplos de `eudaimonía`, `enérgeia` y `areté`, y de preguntas de seguimiento sobre las condiciones de la felicidad.

## Cambio filosófico y editorial

- `agora.llm.prompt.v2` privilegia **una explicación legible, articulada y libre**; se fundamenta en los pasajes de la *Ética* realmente recuperados en griego y castellano.
- Permite inferencias argumentadas, comparaciones entre pasajes y distinciones conceptuales; **no autoriza inventar citas ni referencias Bekker**. Cuando un antecedente es indispensable, menciona el límite una vez, sin bloquear toda la explicación. No equipara «no estaba entre estas cuatro citas» con «Aristóteles nunca lo afirma».
- Las fichas y FAQ son **guías pedagógicas**, no otras fuentes primarias. Se mantiene la convención «virtud completa en una vida entera» y se evita confundir los sentidos de *lógos*.
- Conserva las mismas fuentes, sus identificadores y el procedimiento de recuperación: hasta cuatro pasajes verificados y dos fichas, sin añadir automáticamente pasajes de especialistas todavía.

## Contrato de salida

Un solo pedido a OpenRouter genera dos secciones. La separación técnica emplea el marcador `<<<AGORA_AUDITORIA_V2>>>`, que **no aparece en la respuesta visible del usuario**. El servidor separa la transmisión incluso si el marcador llega fragmentado entre eventos SSE.

1. `respuesta`: explicación al lector, en streaming, con las citas utilizadas cuando corresponda.
2. `auditoria_llm`: autoevaluación **visible al lector al final** y guardada en columna independiente, con cobertura de citas, recuperación faltante, propuestas concretas para fichas/FAQ y cautelas interpretativas.

La autoevaluación de la LLM **no certifica que exista un problema real** en nuestras fichas: constituye una propuesta para revisión editorial. Si el modelo olvida la segunda parte, la respuesta no se pierde; se registra `auditoria_disponible = 0` y la interfaz advierte la omisión. Las preguntas posteriores se apoyan solamente en `respuesta`, sin contaminar el historial con autoevaluaciones.

La nueva salida emite `event: delta` para el texto del lector y `event: audit_delta` para la segunda sección. El evento `done` devuelve `answer`, `editorialAudit`, `auditMissing` y los metadatos habituales. `POST /api/llm/chat` (sin streaming) devuelve las mismas propiedades.

## Migración MariaDB

**Después de haber instalado N1-U.17.2**, ejecutar en la misma base donde ya existe `llm_interacciones`:

`db/migrations/2026-11-23_llm_evaluacion_editorial.sql`

La migración añade dos columnas (MariaDB `ADD COLUMN IF NOT EXISTS`):
- `auditoria_llm MEDIUMTEXT`: evaluación que propone la LLM (no el dictamen de un editor).
- `auditoria_disponible TINYINT`: 1 si se obtuvo esa segunda sección.

No altera registros anteriores ni reescribe la columna `respuesta`. El backend envía ambos textos mediante parámetros SQL, y no registra claves, cookies, IP ni razonamiento interno del proveedor.

Para inspección con acceso autorizado:

```sql
SELECT id, creado_en, modelo, prompt_version, revision_editorial,
       LEFT(pregunta,120) AS pregunta,
       LEFT(respuesta,220) AS explicacion,
       auditoria_disponible,
       LEFT(auditoria_llm,320) AS evaluacion
FROM llm_interacciones
ORDER BY id DESC LIMIT 10;
```

Si el registro está activo pero la migración aún no fue ejecutada, la generación **no se pierde**, pero el backend marcará «Registro editorial no confirmado». Ejecutar primero la migración antes de la prueba real.

## Instalación (CMD o Git Bash desde la raíz del repositorio)

Requisitos: N1-U.17.2 instalado, MariaDB con su migración previa, `OPENROUTER_API_KEY` ya configurada en el servidor.

```bash
git status --short
git apply --check agora-n1u173-prompt-dos-salidas.patch
git apply agora-n1u173-prompt-dos-salidas.patch
node --test test/llm/n1u17.test.mjs test/llm/n1u172.test.mjs test/llm/n1u173.test.mjs
node public/scripts/check-n1u172-chat.mjs
node public/scripts/check-n1u173-ui.mjs
node public/scripts/check-n1u17-ui.mjs
```

Después de aplicar la migración y confirmar `AGORA_LLM_AUDIT_ENABLED=1`, reiniciar el backend. `OPENROUTER_MAX_TOKENS=3000` es una configuración de prueba razonable para permitir las dos secciones; el coste y el límite final dependen del modelo. El cupo sigue siendo de seis generaciones exitosas por sesión.

## Prueba editorial sugerida

1. «¿Cuál es la relación entre felicidad, enérgeia y areté?» — verificar que ofrece una explicación útil y no una enumeración de carencias documentales.
2. «¿Cuáles son las condiciones de la felicidad?» — verificar que sintetiza con fluidez y no atribuye a Aristóteles pasajes ajenos.
3. «¿Podés enumerar esas condiciones?» — verificar continuidad conversacional y auditar si los pasajes recuperados para el seguimiento resultan insuficientes.
4. Comprobar que la evaluación termina al final de cada respuesta, aparece diferenciada y se guarda en `auditoria_llm`, mientras que `respuesta` contiene solo la explicación al lector.

## Límites deliberados

- Este incremento **no modifica el algoritmo de recuperación**: un conjunto de cuatro citas sigue pudiendo omitir pasajes decisivos. La evaluación editorial ayuda a identificar esas omisiones para N1-U.18, pero no las resuelve automáticamente.
- El marcador es un protocolo de texto, no un formato garantizado por todos los modelos de OpenRouter. El sistema detecta su omisión y conserva la explicación; no fabrica una auditoría.
- La evaluación generada puede equivocarse sobre las fichas o las relaciones, incluso si suena convincente. Requiere revisión humana.
- La migración y la generación real con la clave del usuario **no fueron ejecutadas por esta preparación**: probar primero en desarrollo y respaldar la base.
