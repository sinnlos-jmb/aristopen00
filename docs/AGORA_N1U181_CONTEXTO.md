# Ágora · N1-U.18.1 — Contexto conversacional y aislamiento de pruebas

Requiere N1-U.17.3. No modifica lab.js, las fichas ni el esquema de MariaDB. Mantiene el streaming, las dos secciones y seis generaciones por sesión. Versión del prompt: agora.llm.prompt.v3 (el delimitador de auditoría V2 no cambia).

## Instalar (CMD, raíz del repositorio)

```bat
git apply --check agora-n1u181-contexto-conversacional.patch
git apply agora-n1u181-contexto-conversacional.patch
node --test test/llm/n1u17.test.mjs test/llm/n1u172.test.mjs test/llm/n1u173.test.mjs test/llm/n1u181.test.mjs
node public/scripts/check-n1u173-ui.mjs
node public/scripts/check-n1u172-chat.mjs
node public/scripts/check-n1u17-ui.mjs
```

La prueba original de N1-U.17 instanciaba la auditoría por defecto: si el entorno habilita AGORA_LLM_AUDIT_ENABLED, accedía al pool real. Ahora inyecta una auditoría desactivada; las pruebas de registro usan un doble de DB. No hace falta desactivar el registro de la app ni ejecutar escrituras reales para testear. Las 25 pruebas terminaron en la reconstrucción aun con AGORA_LLM_AUDIT_ENABLED=1. Se usó un config mínimo para la reconstrucción; no se probó el pool real, el servidor completo ni OpenRouter.

## Verificar el esquema real (solo lectura)

Desde tu cliente MariaDB conectado a la base de desarrollo de Ágora:

```sql
SELECT DATABASE() AS esquema_activo;
SHOW COLUMNS FROM llm_interacciones;
SELECT COLUMN_NAME FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'llm_interacciones'
   AND COLUMN_NAME IN ('auditoria_llm','auditoria_disponible');
```

Si la última consulta devuelve dos filas, ambas columnas nuevas existen. No demuestra que todas las demás columnas coincidan. Si falta alguna, respaldar la base y revisar/ejecutar las migraciones ya entregadas, en este orden: `db/migrations/2026-11-23_llm_interacciones.sql`, `db/migrations/2026-11-23_llm_evaluacion_editorial.sql`. La primera crea la tabla si no existe; no repara una tabla existente con otras columnas. La segunda añade las columnas de auditoría si no existen. Si persiste ER_BAD_FIELD_ERROR compartir SHOW COLUMNS (sin datos de lectores). No ejecutar DROP ni reconstruir una base existente. El error de ayer no identifica por sí solo la columna faltante.

## Probar con el modelo real

Reiniciar npm start, abrir Lab > Consultas y recuperación > Asistente LLM. Preguntar: 1) ¿Cuál es la relación entre felicidad, enérgeia y areté? 2) ¿Cuáles son las condiciones de la felicidad? 3) ¿Podés enumerar esas condiciones? Comprobar que se conserva el hilo, que una fuente conservada mantiene el mismo identificador E, que se distinguen recuperación/historial/contexto y que la auditoría está separada. Verificar registro (si está habilitado):

```sql
SELECT id, prompt_version, estado, auditoria_disponible,
       JSON_LENGTH(fuentes_json) AS fuentes, creado_en
  FROM llm_interacciones ORDER BY id DESC LIMIT 6;
```

## Contrato y límites

- El cliente envía hasta cinco IDs de turnos exitosos visibles; el servidor obtiene preguntas, respuestas y referencias desde su propia sesión. No confía en textos del historial enviados por navegador. Si la sesión o revisión cambió, devuelve 409 y pide recargar; no consume crédito. El historial es efímero, no se reconstruye de MariaDB. Las respuestas anteriores se acotan a 2200 caracteres por turno y no son evidencia primaria.
- Para preguntas cortas o con señales de seguimiento se combina la pregunta con hasta dos preguntas anteriores; es una heurística léxica, no desambiguación semántica. Hasta cuatro subunidades nuevas, hasta dos fuentes anteriores adicionales y hasta dos párrafos vecinos del primer pasaje (mismo capítulo, cuando hay anclas y numeración contigua). Con selección manual se respeta la selección y no se añaden citas del historial; sí se pueden añadir vecinos. Si la búsqueda nueva falla pero existen fuentes anteriores verificadas, se pueden usar estas. No se promete contexto completo de cada fuente.
- Cada identificador E es estable para el par revisión/ID dentro de la sesión; se registra en fuentes_json con origen y recorte. Puede haber saltos en la numeración. Solo las fuentes enviadas en el turno se pueden citar como verificadas. Los fragmentos se limitan a 1500 caracteres ES y 850 GR, e indican recorte. No se cambian las etiquetas ni se introducen citas inventadas.
- Las solicitudes exitosas se conservan durante la vida de la sesión (hasta seis); se preserva idempotencia más allá de los diez minutos anteriores. El cupo sigue siendo efímero. El contexto más amplio puede aumentar el coste de entrada; no hay llamadas externas adicionales.
- No incluye navegación de grafos ni asistente Cypher; son los siguientes incrementos.
