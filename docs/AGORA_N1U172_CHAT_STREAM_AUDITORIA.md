# Ágora · N1-U.17.2 · Diálogo continuo, streaming y auditoría editorial

## Objetivos

Esta es una actualización de N1-U.17 **con N1-U.17.1 ya aplicado**. No cambia `public/js/views/lab.js`, las fichas, la lectura bilingüe ni tablas existentes.

- `/#/lab/consultas` → **Asistente LLM** ahora muestra todos los turnos como una conversación (hasta seis en la vista). Solo las **preguntas** usan globitos, acordes al estilo del chat de FAQ; las respuestas aparecen como texto abierto de lectura y van creciendo por streaming. Se lleva automáticamente la vista a la intervención más reciente. El texto recibido se presenta con `textContent`/escape HTML, sin interpretar HTML remoto.
- Nuevo `POST /api/llm/chat/stream` con `fetch` y `text/event-stream`. El servidor recupera las fuentes canónicas y las fichas editorialmente compatibles, luego reenvía `meta`, `delta`, `done` o `error`. También se mantiene el endpoint anterior `/api/llm/chat` para compatibilidad.
- El contenido de las respuestas se guarda íntegro hasta el límite de seguridad (9.000 caracteres); cuando el proveedor devuelve `finish_reason=length`, la interfaz indica que **puede estar incompleta**. La respuesta anterior cortada en «la felicidad no es una» puede haber sido una finalización por límite de tokens: hay que comprobar `finish_reason`.
- Nueva auditoría opcional en MariaDB con pregunta, respuesta, fuentes **por ID y referencia** (no su contenido íntegro), ficha, modelo, estado, revisión documental, versión del prompt y tokens reportados. **No** se guardan API keys, cookies, IP, prompts internos ni razonamiento oculto del modelo.
- Se conservan **seis generaciones correctas por sesión**. Un fallo de generación libera el cupo y, cuando el registro está activado, deja una fila `error` o `parcial`. Un fragmento generado antes de un fallo no se anuncia como respuesta completa.

## Instalación (Windows CMD o Git Bash)

Se requiere la base N1-U.17.1 (corrección a OpenRouter vacío) y N1-U.16 integrado. Descargá el archivo `agora-n1u172-dialogo-stream-auditoria.patch` en la raíz de `aristopen`.

```cmd
  git status --short
  git apply --check agora-n1u172-dialogo-stream-auditoria.patch
  git apply agora-n1u172-dialogo-stream-auditoria.patch
  node --test test/llm/n1u17.test.mjs test/llm/n1u172.test.mjs
  node public/scripts/check-n1u172-chat.mjs
  node public/scripts/check-n1u17-ui.mjs
  node public/scripts/check-views.mjs
```

El parche no modifica `public/js/views/lab.js` y no exige nuevos paquetes npm.

### MariaDB: migración nueva y activación

1. **Respaldar** la base de desarrollo y confirmar en qué esquema corre Ágora.
2. Inspeccionar y ejecutar el archivo `db/migrations/2026-11-23_llm_interacciones.sql` en **esa base**. Contiene únicamente `CREATE TABLE IF NOT EXISTS llm_interacciones` y sus índices. No borra ninguna tabla.
3. En `.env` del backend, agregar:

```dotenv
AGORA_LLM_AUDIT_ENABLED=1
# Opcional: si el modelo termina con frecuencia por límite de tokens
OPENROUTER_MAX_TOKENS=3000
```

4. Reiniciar el backend. En la pestaña «Asistente LLM» aparecerá el aviso de que el registro editorial está activo. **La clave OpenRouter permanece en el servidor** (`OPENROUTER_API_KEY`) y nunca se copia en el navegador.
5. Tras una consulta, inspeccionar en MariaDB (con un usuario de lectura autorizado):

```sql
SELECT id, creado_en, modalidad, modelo, estado, incompleta,
       revision_editorial, LEFT(pregunta,140) AS pregunta,
       LEFT(respuesta,180) AS respuesta
FROM llm_interacciones ORDER BY id DESC LIMIT 20;
```

Si la tabla todavía no existe o la base no está disponible, la LLM continúa funcionando: la interfaz indicará **«Registro editorial no confirmado»** en la respuesta. El backend escribe un error técnico sin la pregunta ni la clave. No se pierden respuestas por una falla de auditoría.

### Revisión filosófica y mejora de fichas

La tabla tiene `revision_editorial` (`pendiente`, `revisado`, `candidato_faq`, `candidato_ficha`, `problema_citas`, `problema_sentidos`) y `nota_editorial`. En esta versión NO se expone una API pública de lectura de conversaciones ni de modificación de estados: la revisión debe hacerse por una persona con acceso autorizado a MariaDB. Estas etiquetas **no constituyen evidencia automática** de defectos en las fichas: son tareas de evaluación editorial. Un caso como *lógos* razón vs argumento puede clasificarse `problema_sentidos`.

El registro requiere un aviso de privacidad claro antes de abrir la app a usuarios externos, un plazo definido de retención y acceso restringido. No registrar información sensible en las preguntas. Para limpiar datos después de la revisión, realizar un procedimiento manual acordado de anonimización o borrado; este parche no ejecuta purgas automáticas.

## Comprobaciones funcionales

1. Abrir `/#/lab/consultas` → **Asistente LLM**, hacer cuatro preguntas. Deben verse cuatro preguntas en globitos y cuatro respuestas completas, sin quedar inmóvil en la primera. El cupo pasa de seis a dos.
2. La primera palabra de una respuesta debe aparecer antes de que llegue la respuesta final (streaming); observar `POST /api/llm/chat/stream`, con `Content-Type: text/event-stream`.
3. Verificar que las respuestas puedan desplazarse y que los apartados de fuentes y fichas permanezcan plegables.
4. Probar una respuesta larga con Nemotron; si llega con `finish_reason=length`, debe advertirse que está incompleta. No atribuirle falsamente una conclusión.
5. Provocar un error de proveedor: la fila, si hay auditoría activa, debe marcarse como `error` o `parcial`, sin gastarse un crédito exitoso.
6. Verificar en DB que existen filas separadas, con fuentes identificadas y revisión documental, pero sin cookies ni claves.

## Evidencia de pruebas y límites

- Tests locales: lector SSE de OpenRouter, error a mitad de stream, lector SSE del navegador, cuatro generaciones sucesivas, conservación del cupo, auditoría SQL parametrizada y composición de cuatro mensajes visibles en la UI, además de la suite previa N1-U.17.
- La pasarela usa Server-Sent Events de OpenRouter Chat Completions, con chunks `choices[0].delta.content`, y reconoce el chunk final de uso, `[DONE]` y errores emitidos después de empezar la transmisión. Referencia: https://openrouter.ai/docs/api-reference/streaming
- Pendiente: **prueba con tu instalación real, OpenRouter y MariaDB**. No se ejecutó la migración ni se usó tu clave. Al editar `labConsultaView.js`, si hay cambios locales adicionales es posible que `git apply --check` detecte diferencias: no fuerces el parche; compartí ese archivo para adaptar las líneas sin sobrescribir tus cambios.
