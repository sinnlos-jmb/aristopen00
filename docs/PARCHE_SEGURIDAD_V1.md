# Ágora — Parche de seguridad v1

**Fecha:** 2026-11-10. **Base de referencia:** archivos entregados en la conversación (`bacl.7z`, frontend refactorizado y `test.zip`), más pruebas de integración posteriores. **No se ha modificado el repositorio remoto**.

## Alcance exacto

1. `src/middleware/require-editor.js`: elimina la excepción que dejaba editar sin token en desarrollo/test. **Toda escritura editorial** necesita `EDITOR_TOKEN`. Sin token, HTTP 503; con token erróneo/ausente, HTTP 401; con token correcto, continúa. Se exporta la factoría `crearRequireEditor()` para pruebas unitarias.
2. `server.js`: advierte siempre al iniciar si la edición está deshabilitada. Ningún cambio en puerto ni API.
3. `src/middleware/error-handler.js`: para errores MariaDB conocidos, mantiene el status y el error público pero **deja de incluir `err.sqlMessage`** en JSON. Los detalles explícitos de validación (`HttpError`) se conservan.
4. `public/js/router.js`: sustituye `innerHTML` por `createElement`, `textContent` y `replaceChildren` al mostrar excepciones.
5. `test/db.test.mjs` + `test/helpers/destructive-guard.mjs`: antes de importar herramientas SQL o crear un pool, exige:
   - `TEST_DB_NAME` explícita y distinta de `aristotle`, con formato `test_*` o `*_test`.
   - `ALLOW_DESTRUCTIVE_DB_TESTS=YES_DELETE_TEST_DB`.
   - Configuración efectiva de `DB_HOST` en `127.0.0.1`, `localhost` o `::1`.
   **Advertencia:** localhost puede redirigirse a un servidor remoto con un túnel. Se exige, además, instancia descartable y credenciales sin permisos sobre `aristotle`. La suite antigua sigue dependiendo de herramientas y datos auxiliares que pueden faltar; no se intenta ejecutarla aquí.
6. `test/security/`: nuevas pruebas unitarias sin conexión a MariaDB.
7. `test/integration/api-frontend.test.mjs`: agrega una prueba HTTP no destructiva de rechazo de POST sin autorización. Si tu servidor usa un token válido, devuelve 401; sin token, 503. No envía token ni crea registros.

## Aplicación recomendada con Git (CMD o PowerShell)

Desde la raíz donde están `server.js`, `src/` y `public/`:

```powershell
git status --short
git switch -c fix/seguridad-editorial-v1
# Colocá el archivo .patch descargado fuera del repositorio o en la raíz.
git apply --check agora-seguridad-v1.patch
git apply agora-seguridad-v1.patch
```

Si `git apply --check` falla, **no fuerces el parche**: alguna de las versiones de Git es distinta de la copia revisada. Compará los archivos con el ZIP de solo cambios y aplicá únicamente los cambios correspondientes.

## Validación

Ejecutar, sin tocar MariaDB:

```powershell
node --test test/security/*.test.mjs
```

Luego, con tu servidor ya iniciado y el acceso a la base funcionando:

```powershell
npm run test:integracion
```

Esperado: 10 pruebas unitarias de seguridad y **12** pruebas de integración (las 11 anteriores + nueva prueba de autorización anónima). Las cuatro pruebas SQL siguen requiriendo `INTEGRATION_DB=1` en el entorno local, como antes. El resultado de 12 pruebas se deberá comprobar en tu instalación: **no se ejecutó contra tu MariaDB de la nube**.

## Configuración editorial

Para habilitar las operaciones editoriales, declarar `EDITOR_TOKEN` en un entorno seguro, **nunca** en código público ni en Git. Antes de eso, todas las rutas de escritura de `/api/faqs` y `/api/trayectos` responderán 503. No es necesario configurar el token para consultar contenido, diálogo ni lectura. Reiniciar el servidor después de configurar el token.

## Seguridad de Git

Verificar que `.env`, credenciales y dumps privados estén ignorados antes de registrar cambios. La contraseña de base de datos previamente compartida debe rotarse. Revisar `git diff --check`, `git diff` y `git status` antes de `git commit` o `git push`.

## Límites

Este parche no altera el corpus, el modelo de trayectos, las traducciones, ni las consultas SQL. No introduce rate limiting ni corrige la autorización de cualquier endpoint adicional de escritura si apareciera en versiones futuras. No sustituye pruebas de navegador ni una revisión de configuración de despliegue.
