# Ágora — Laboratorio: Explorador semántico V1

## Objetivo y aislamiento

Crear una proyección **experimental y sólo de lectura** de `App.S` (derivado de `/api/contenido`, cuya fuente de verdad es MariaDB) para explorar estructuras antes de añadir inferencias o generación de respuestas.

Nueva ruta: `/#/lab/semantica`. Se conserva el Orientador V2 como piloto separado; ni los tags ni las FAQ se editan desde este experimento. Si Relate no está instalado, el explorador de JavaScript sigue funcionando.

## Modelo de la proyección

Clases de nodo: `concepto_estatico`, `nodo_funcional`, `unidad`, `subunidad`, `parrafo`, `faq`, `definicion`. Los UIDs son nombres separados (`concepto_estatico:phusis` y `nodo_funcional:phusis` son distintos).

Relaciones explícitas exportadas:

- `jerarquia_estatica`, `jerarquia_funcional`: hijo a padre.
- `arista_funcional`: dirección original `de → a`, con tipo, voz y referencia.
- `remision_editorial`: nodo funcional hacia concepto estático, con sufijo de sentido referido **sin declarar el sentido como ficha comprobada**.
- `pertenece_unidad`: subunidad → unidad.
- `tag_subunidad`: subunidad → concepto citado en `conceptos_clave` (asociación editorial, NO evidencia textual detallada).
- `tag_parrafo`: párrafo → concepto tagueado, conservando sentido `s` y nivel `n` (NO se eleva automáticamente a subunidad).
- `definicion_de`: registro de definición → concepto correspondiente.
- `foco_faq`: FAQ → `arbol.nodo` explícito.
- `pasaje_faq`: FAQ → subunidad cuando el `pasajes.ref` coincide **exactamente** con el ID de una subunidad. Si es un rango Bekker no coincidente, se reporta incidencia (no se adivina correspondencia).

La proyección registra extremos no resueltos en `issues`. La exploración puede seguir enlaces en ambos sentidos para descubrir vecinos, pero **muestra siempre la dirección original** de la relación. No puntúa relevancia filosófica ni genera trayectos. `sugerirConceptosSemanticos()` ofrece candidatos estructurales con su recorrido y un estado de hipótesis, sin modificar la consulta del estudiante. Es un futuro insumo del Orientador, no una integración automática.

## En el navegador

1. Abrir `/#/lab/semantica` (Laboratorio → Explorador semántico).
2. Buscar `phusis`, `arete`, `eudaimonia` o un identificador; seleccionar un nodo.
3. Alternar 1 o 2 saltos y examinar diagrama, aristas, procedencia y sugerencias exploratorias con un testigo de hasta 2 vínculos.
4. Exportar el JSON, la vecindad seleccionada, o el Cypher compatible con Relate.
5. Abrir «Diagnóstico de referencias no resueltas» para revisar vínculos no materializados.

## Relate — experimento optativo

Relate es un proyecto experimental de Neo4j Labs. Descargar una versión oficial para Windows desde https://github.com/relatedb/relate/releases/latest y comprobar `relate --help`. No se requiere instalarlo en el servidor web de Ágora.

Con Ágora levantada en localhost, desde la raíz del repositorio:

```bash
node public/scripts/exportar-grafo-cypher.mjs http://localhost:3000/api/contenido agora-relate-import.cypher
relate ./relate-agora < agora-relate-import.cypher
relate --database ./relate-agora "MATCH (n:AgoraNodo) RETURN count(n) AS nodos"
relate --database ./relate-agora "MATCH (a:AgoraNodo)-[r:AGORA_VINCULO]->(b:AgoraNodo) WHERE r.tipo = 'arista_funcional' RETURN a.id, r.relacion, b.id, r.referencia LIMIT 20"
```

La primera ejecución crea/actualiza sólo una proyección en Relate. Se utilizan UIDs e instrucciones `MERGE`; **no borra** otros datos preexistentes. Para pruebas limpias se recomienda un directorio nuevo. Comprobar la sintaxis exacta con la versión instalada del CLI, pues Relate aún es experimental.

### Interpretación de los resultados

Comparar el total en Relate con `stats.nodos` y `stats.aristas` del explorador. Revisar una relación `arista_funcional` en los dos motores y comprobar `de`, `a`, `rel`, `ref` y `voz`. Una relación por `tag_parrafo` o `tag_subunidad` no justifica por sí sola un vínculo causal. Una remisión no hace idénticos los dos nodos.

## Pruebas y limitaciones

Desde la raíz del proyecto:

```bash
node public/scripts/check-semantic-explorer.mjs
npm --prefix public run test:views
```

Este incremento no instala ni ejecuta Relate de forma automática: proporciona una exportación Cypher comprobable localmente con un binario oficial. Una integración nativa/WASM o HTTP, y la unión dinámica con consultas del Orientador, se consideran incrementos posteriores.
