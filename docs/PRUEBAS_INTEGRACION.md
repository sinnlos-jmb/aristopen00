# Ágora — línea base de integración (10-11-2026)

## Alcance

Pruebas **no destructivas** que leen el servidor Express en ejecución (frontend + API), reconstruyen el `Store` y un diálogo con los módulos reales de `public/`, verifican la biblioteca bilingüe, comprueban los endpoints `/api/labo/` y, opcionalmente, consultan MariaDB usando solo `SELECT`.

No escriben en `aristotle`, no importan ni migran tablas y **no prueban publicación/edición de trayectos**. Tampoco juzgan la exactitud filológica de las traducciones: la comparación SHA-256 detecta desajustes técnicos entre fuente SQL y texto servido.

## Instalación

1. Copiar `test/integration/` dentro de `back/test/integration/`, conservando los tests anteriores de `back/test/`.
2. Copiar `docs/PRUEBAS_INTEGRACION.md` dentro de `back/docs/`.
3. Integrar el `package.json` entregado en la raíz de `back/` (si ya tenés uno ampliado, agregar solo `scripts.test:integracion` y conservar tus dependencias existentes).
4. Mantener la carpeta `public/` como `back/public/` o hermana de `back/`. Si está en otro sitio, configurar `PUBLIC_DIR`.
5. Instalar dependencias con `npm install` y, después de revisar, guardar `package-lock.json` en el proyecto.
6. Configurar `DB_NAME=aristotle` en el `.env` del servidor, si no está ya establecido. El nombre por defecto en el `src/config.js` original seguía siendo `agora`.

## Ejecución (PowerShell, Windows)

Terminal 1 — servidor:

```powershell
cd back
npm start
```

Terminal 2 — sin conexión directa a MariaDB (la API sí consulta MariaDB):

```powershell
cd back
$env:INTEGRATION_URL = 'http://127.0.0.1:3000'
npm run test:integracion
```

Para contrastar API ↔ tablas SQL, **usar credenciales de solo lectura**:

```powershell
$env:INTEGRATION_DB = '1'
$env:DB_NAME = 'aristotle'
$env:DB_HOST = '127.0.0.1'
$env:DB_PORT = '3306'
$env:DB_USER = 'agora_readonly'
$env:DB_PASSWORD = '<contraseña-local>'
npm run test:integracion
```

Si tu MariaDB solo tiene un usuario de edición, crear uno limitado para las pruebas, o por ahora ejecutar únicamente la suite HTTP. No guardar contraseñas en el repositorio.

## Comandos Linux/macOS

```bash
INTEGRATION_URL=http://127.0.0.1:3000 npm run test:integracion
INTEGRATION_DB=1 DB_NAME=aristotle DB_USER=agora_readonly DB_PASSWORD='...' npm run test:integracion
```

## Nota sobre los tests legados que enviaste

- `test/db.test.mjs` **borra y recrea las tablas** de `TEST_DB_NAME` (su valor por defecto en la copia recibida es `agora_test`). No ejecutar con `TEST_DB_NAME=aristotle` ni con la misma base que `DB_NAME` de producción.
- Algunos tests presuponen **27 FAQ**, **218 conceptos** y otros conteos anteriores. El dump compartido incluye 31 FAQ y 221 conceptos. Actualizarlos solamente después de recuperar los scripts en `tools/` y las fuentes/plantillas originales: los conteos nuevos deben verificarse, no reemplazarse mecánicamente.
- `test.zip` referencia `tools/lib/load-data.mjs`, `tools/db-migrate.mjs`, `tools/db-import.mjs`, `tools/lib/run-faq.mjs`, `tools/lib/grafo-check.mjs`, `tools/lib/strict-json.mjs`, `tools/snapshot-faqs.mjs` y `plantillas/faqs.ejemplo.json`, **no presentes en los adjuntos del backend**. Esos tests no se consideran ejecutables todavía.
- `test:integracion` selecciona **solo** los nuevos archivos `test/integration/*.test.mjs`, por lo que no activa las pruebas destructivas antiguas.

## Qué exige cada prueba

| Componente | Comprobación |
|---|---|
| Express / MariaDB | `/api/health` responde con DB operativa |
| Frontend servido | HTML, `main.js`, vistas y estilos están accesibles |
| API de contenido | Estructura de bundle y ausencia de ID duplicados |
| API editorial de lectura | Listas de FAQ/unidades equivalentes al bundle |
| Frontend ↔ API | `buildStore`, bot y lectura bilingüe consumen el bundle real |
| Laboratorio | Revisión coherente en `/inicio`, `/lectura`, `/grafos`, `/buscar` |
| Manejo de error | 404 de API y 409 para revisión obsoleta |
| DB ↔ API (opcional) | Identificadores de unidades/subunidades/FAQ y trayectos publicados iguales |
| Texto ↔ DB (opcional) | Texto idéntico byte a byte y SHA-256 correcto |

## Limitaciones

Estas pruebas validan contratos y flujo de datos, **no la interacción visual de un navegador real**. No sustituyen una prueba manual de navegación por `/chat`, `/reading`, `/grafos` y `/lab` ni los tests funcionales editoriales en una base desechable.

Si hay ediciones concurrentes mientras corren las comparaciones SQL/API, puede haber diferencias temporales (el backend cachea contenido durante 5 segundos). Ejecutar con el corpus estable.
