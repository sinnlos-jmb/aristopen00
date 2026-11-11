# Orientador V1: entrada libre y registro voluntario

La opción «Otra…» permite buscar nodos estáticos/funcionales por identificador, etiqueta o griego, y conserva el texto literal cuando no hay coincidencia. Muestra las aristas **con dirección**, sin confundir un nodo encontrado con una relación demostrada. Ningún candidato se puntúa todavía.

## MariaDB

Ejecutar `docs/sql/2026-11-11-user_queries.sql` en `DB_NAME` antes de activar el registro. Es una migración **aditiva**. No ejecutar archivos antiguos de reconstrucción de la base. Sin esa tabla el endpoint falla con error SQL, pero el orientador sigue funcionando y puede exportar el JSON.

Tras cerrar la consulta, el estudiante puede decidir **registrarla voluntariamente**. El frontend hace `POST /api/user-queries` con la inquietud, estado, `QuerySpec` y bitácora; el servidor valida y guarda sólo inquietud, `QuerySpec`, aportes escritos sin coincidencia y estado de coincidencia FAQ. No se guarda nombre, IP ni bitácora completa en la tabla. No hay GET público del registro. La respuesta confirma el resultado.

Un `faq_match_estado='pregunta'` o `'variante'` significa **coincidencia textual exacta normalizada** con una FAQ o variante. `multiple` significa conflicto entre FAQ y `sin_match_exacto` significa que **no hubo coincidencia textual exacta**; no implica ausencia de respuesta semántica o de otra FAQ adecuada. Revisar estos casos editorialmente antes de convertirlos en nuevas FAQ. La coincidencia es recalculada por el servidor, no declarada por el cliente.

La ruta pública de registro no debe exponerse a Internet sin limitación de tasa, medidas antiabuso, política de privacidad y retención; esta etapa es una maqueta para demostración supervisada.

## Verificación

`node public/scripts/check-orientador-libre.mjs` valida búsqueda, nodos conocidos y aportes libres. `node src/test/user-queries.test.mjs` valida contratos de registro y coincidencias FAQ sin acceder a MariaDB.
