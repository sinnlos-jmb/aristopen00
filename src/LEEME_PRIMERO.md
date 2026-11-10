# Parche de integración para el backend de Ágora

Extraer **el contenido** de este ZIP en la carpeta raíz del backend (`back/`), donde se encuentran `server.js` y `src/`.

- `test/integration/` es nuevo: no sobrescribe los tests históricos.
- `docs/PRUEBAS_INTEGRACION.md` incluye instalación y comandos de Windows/Linux.
- `package.json` completa el archivo recibido, que solo contenía `{ "type": "module" }`. Si tu proyecto local contiene dependencias o scripts adicionales, **fusionar** en vez de sobrescribirlo.
- `src/config.js` solo cambia el valor por defecto de `DB_NAME` de `agora` a `aristotle`. Se respeta cualquier `DB_NAME` configurado en el entorno.

**Precaución:** no ejecutar `test/db.test.mjs` del ZIP anterior sobre `aristotle`: ese archivo puede borrar y recrear tablas. El comando `npm run test:integracion` solo ejecuta los nuevos tests no destructivos.

No se cambiaron endpoints, lógica editorial, texto, traducciones ni trayectos.
