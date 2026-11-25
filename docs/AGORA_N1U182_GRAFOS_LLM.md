# Ágora N1-U.18.2 — Exploración de grafos por LLM y prompt v4

Requiere N1-U.18.1. No modifica lab.js, las fichas, las aristas editoriales ni las tablas de corpus. Nuevo modo explícito «Explorar grafos» en Lab > Consultas y recuperación > Asistente LLM. La lectura guiada y el contraste mantienen una sola solicitud externa por turno. El prompt v4 se aplica a los tres modos; conserva el marcador de auditoría V2 y flexibiliza la explicación y la evaluación editorial.

## Instalación

Desde CMD, raíz del repositorio (extraer el ZIP primero):

```bat
git apply --check agora-n1u182-llm-grafos.patch
git apply agora-n1u182-llm-grafos.patch
node --test test/llm/n1u17.test.mjs test/llm/n1u172.test.mjs test/llm/n1u173.test.mjs test/llm/n1u181.test.mjs test/llm/n1u182.test.mjs
node public/scripts/check-n1u173-ui.mjs
node public/scripts/check-n1u172-chat.mjs
node public/scripts/check-n1u17-ui.mjs
```

Antes de activar/probar el registro de grafos, respaldar la base de desarrollo y ejecutar `db/migrations/2026-11-24_llm_grafo.sql` en MariaDB. Agrega la columna nullable `grafo_json` a la tabla existente `llm_interacciones`. No toca registros previos. Requiere las migraciones N1-U.17.2 y N1-U.17.3 ya aplicadas. Las interacciones sin traza conservan el INSERT anterior. Conservar `AGORA_LLM_AUDIT_ENABLED=1` si se desea guardar las consultas. Reiniciar `npm start`. No cambiar ni compartir la clave de OpenRouter.

## Probar

1. Seleccionar Lectura guiada. Preguntar «¿Por qué la felicidad es actividad (enérgeia) del alma?». Comprobar fluidez y evaluación separada.
2. Elegir Explorar grafos. Preguntar «Buscá la ficha de felicidad y el argumento del érgon. ¿Qué relación editorial los une? Recuperá el apoyo de la definición central y explicame por qué se habla de virtud completa en una vida entera».
3. Abrir «Recorrido del grafo». Inspeccionar las operaciones reales, las aristas dirigidas listadas y el SVG con enlaces a fichas. Comprobar que las fuentes nuevas tienen origen `grafo`, y que los IDs [E] se mantienen. Si el modelo decide no llamar herramientas, el estado es `sin_consultas_validas`: no se fabrica un recorrido. El grafo puede incluir nodos aislados si se buscaron sin encontrar aristas.
4. Repreguntar «¿Cómo llego desde esa ficha hasta la clasificación de las virtudes?». Comparar las relaciones encontradas y el modo en que el modelo las explica. Este incremento no amplía el intérprete Cypher; será N1-U.18.3.

Consulta de comprobación (solo lectura):

```sql
SELECT id, modalidad, modelo, prompt_version, estado, auditoria_disponible,
       JSON_VALID(grafo_json) AS grafo_valido,
       JSON_LENGTH(JSON_EXTRACT(grafo_json,'$.steps')) AS pasos,
       tokens_entrada, tokens_salida
FROM llm_interacciones ORDER BY id DESC LIMIT 8;
```

## Herramientas y alcance

- `buscar_nodos`: coincidencia léxica en títulos/IDs/referencias del grafo.
- `explorar_subgrafo`: 1–3 aristas entre fichas, dirección entrante/saliente/ambas; apoyos opcionales, hasta 18. Para vecinos directos usar depth=1.
- `buscar_caminos`: un camino mínimo de hasta tres aristas, recorrido en ambos sentidos pero conservando la dirección editorial de cada relación.
- `obtener_ficha`: introducción y apoyos documentales registrados.
- `obtener_evidencia`: hasta cuatro IDs de subunidad verificados contra el índice activo.
- `buscar_pasajes`: búsqueda léxica de subunidades en el corpus; los resultados no generan aristas.

El prototipo utiliza las 7 fichas, 8 relaciones editoriales piloto y apoyos de N1-U.5/6/7. Se exige coincidencia de revisión documental. No accede a todos los grafos históricos ni al futuro grafo sincrónico; no ejecuta Cypher o SQL suministrado por la LLM. Los vínculos registrados pueden ser propuestas, no verdades filosóficas validadas. El recorrido es una vista SVG con enlaces a fichas y listado de aristas; aún no es un visor Cytoscape completo. Una arista del SVG no implica que el modelo haya utilizado esa relación en su explicación.

## Presupuesto y registro

Modo grafo: hasta dos solicitudes de planificación con herramientas nativas OpenRouter, hasta tres herramientas por ronda, profundidad 3 y hasta cuatro fuentes nuevas (total hasta 12 incluyendo las ocho posibles de N1-U.18.1). Cada ronda devuelve datos controlados al modelo. Después se inicia una generación final en streaming con el contexto y los resultados verificados; no se reenvía el razonamiento privado en el prompt final. La planificación no se muestra como razonamiento del modelo; solo la traza de operaciones ejecutadas. El modelo puede elegir no pedir herramientas. Si el proveedor rechaza tools, se devuelve un error explícito y se puede usar Lectura guiada. Cada turno exitoso usa un crédito de los seis, pero hasta tres solicitudes facturables de OpenRouter; el límite temporal de seguridad cuenta cada solicitud. La planificación tiene presupuesto máximo de 1200 tokens de salida por ronda; la respuesta usa OPENROUTER_MAX_TOKENS habitual. Fallos restituyen el crédito local, no necesariamente costes ya cobrados por el proveedor. Los tokens agregados se guardan si todas las solicitudes informan el campo; si no, se deja NULL. La traza guarda usos de planificación, IDs, aristas, parámetros admitidos y resultados estructurales; no contiene el texto bilingüe completo, claves, cookies ni razonamiento interno.

## Validación y límites

31 pruebas backend pasan con auditoría habilitada en el entorno, pero dobles de DB y OpenRouter. 3 scripts de interfaz pasan, incluido uno con cuatro turnos y eventos grafo. Se probaron los JSON editoriales reales y documentos sintéticos con sus IDs, incluyendo 1098a16-18; no se verificó la recuperación de ese texto contra tu MariaDB. Se reconstruyó el código relevante a partir de parches previos y un config mínimo. No se probó servidor completo, navegación visual en navegador real, migración real ni compatibilidad del modelo Luna Pro con tool calling. El check de N1-U.16 no pudo completarse porque falta lab.js de tu instalación en la reconstrucción; se mantuvo intacto. Verificar la traza y costes en tu instalación.
