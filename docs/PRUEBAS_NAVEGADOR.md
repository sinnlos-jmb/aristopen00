# Ágora: pruebas automáticas de navegador

Estas pruebas validan la **SPA real** con un corpus pequeño y ficticio. El servidor `e2e/server.mjs` entrega los archivos de `public/` y simula dos endpoints de solo lectura (`/api/contenido` y `/api/texto/EN_libro1_v8.txt`). **Nunca accede a MariaDB ni necesita credenciales.**

## Ejecución local opcional

Desde la raíz del repositorio:

```bash
npm install --prefix e2e
npx --prefix e2e playwright install chromium
npm --prefix e2e test
```

En GitHub, el workflow `.github/workflows/browser-e2e.yml` se ejecuta en Pull Requests, pushes a `main` y manualmente desde Actions. Prueba Chromium en escritorio (1440×900) y móvil (390×844), cubriendo cinco vistas, FAQ, desmontaje de Chat y texto bilingüe de muestra.

## Alcance y limitaciones

- Las aserciones comprueban el HTML y los eventos del navegador, pero **no** validan la conexión real Express–MariaDB, permisos editoriales ni contenido filológico.
- No hay publicación ni escritura al corpus. Las pruebas SQL existentes siguen siendo complementarias.
- Si falla una prueba en GitHub, descargar el artefacto `playwright-resultados` para capturas y trazas.
- Para añadir pruebas reales del backend haría falta un entorno aislado adicional; **no** apuntar estas pruebas a la base `aristotle`.
