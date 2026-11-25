# Ágora · N1-U.17 · LLM con OpenRouter y búsqueda por categorías

## Alcance

Incremento sobre N1-U.16 corregido y N1-U.15. **No altera `public/js/views/lab.js`** ni la estructura editorial de fichas/FAQ. La nueva pestaña **Solo categorías** y la pestaña **Asistente LLM** aparecen dentro de **Consultas y recuperación**, ruta `/#/lab/consultas`. El Lab antiguo `/labo/` permanece sin cambios para los experimentos todavía no migrados.

### Pestaña «Solo categorías»

- El usuario elige etiquetas estáticas y/o funcionales, tipo de documento, ficha/FAQ (opcional), modo de coincidencia `Priorizar`/`Restringir` y máximo de resultados; **no escribe una consulta de palabras**.
- La búsqueda compila un AST `agora.query.v1` mediante el mismo motor N1-U.15 TF-IDF + ranking de etiquetas. Con consulta textual vacía, las coincidencias se valoran por etiquetas y el coseno léxico queda en cero. Para evitar resultados arbitrarios, se exige seleccionar al menos una etiqueta.
- Las etiquetas de subunidad proceden de MariaDB; las de párrafo son **proyecciones según anclas**, no juicios editoriales directos. El modo `Restringir` exige al menos una categoría por familia seleccionada. La búsqueda natural deja de aplicar silenciosamente etiquetas seleccionadas en otras pestañas.
- La desambiguación de *lógos* (razón, argumento, discurso) sigue pendiente de revisión filosófica.

### Pestaña «Asistente LLM»

- Solicitud a `GET /api/llm/session` para consultar estado y límite; `POST /api/llm/chat` para una generación.
- Seis generaciones exitosas por sesión; la séptima responde `429`. Un `requestId` impide descontar dos veces por reenvíos equivalentes. Una petición simultánea reserva cupo antes de invocar al modelo; si falla la recuperación o la llamada se libera la reserva.
- Las búsquedas, lecturas, grafos, fichas y FAQ **no consumen cupo**.
- La pestaña admite **lectura guiada** y **contraste interpretativo**; se muestran las fuentes documentales por separado y se advierte que la respuesta generada no es material editorial validado.
- Desde cualquier resultado del Query Builder puede pulsarse «Examinar estas citas con la LLM» y proponer hasta cuatro fuentes. El backend reconstruye cada fuente desde la versión activa de MariaDB: **no acepta citas fabricadas en el navegador**.
- Sin fuentes seleccionadas, el servidor recupera hasta cuatro subunidades bilingües mediante el motor vectorial local. Si la recuperación no presenta pasajes suficientes, responde `422`, sin gastar crédito.
- El backend envía a OpenRouter la pregunta, hasta dos intercambios anteriores (si existen), fragmentos recuperados y, si **coincide la revisión activa**, hasta dos fichas explicativas pertinentes; se señalan expresamente como material editorial, incluso cuando sean borradores. La procedencia se verifica a partir de los apoyos registrados. No envía la base completa ni una clave API al navegador.

## Seguridad y límites del piloto

- La clave `OPENROUTER_API_KEY` permanece en el backend, en una variable de entorno. **Nunca incluirla en `public/`, en el código cliente, en una consulta, en una captura ni en un commit.** Si se expuso una clave real, revocarla y generar otra.
- Endpoint oficial: `POST https://openrouter.ai/api/v1/chat/completions`, Bearer, `model`, `messages`. Se deja `openrouter/free` como opción inicial configurable; puede variar el proveedor/modelo y la reproducibilidad. Para investigar de forma controlada, fijar `OPENROUTER_MODEL` en un ID disponible en tu cuenta.
- Cookies de sesión aleatorias **firmadas**, `HttpOnly`, `SameSite=Strict`, `Secure` en `NODE_ENV=production`. El límite reside en memoria del proceso y caduca tras cuatro horas de inactividad; permite seis generaciones *por sesión de navegador*, **no seis por persona**.
- Protección adicional: 24 intentos al proveedor por hora y dirección IP, solo en memoria. No protege plenamente un despliegue público: reiniciar proceso, borrar cookies, usar distintas conexiones o varias instancias puede eludir restricciones. **No publicar una clave de pago en un servicio abierto al público sin usuarios autenticados, base compartida de créditos, cuotas persistentes y presupuestos en OpenRouter.**
- No se escriben transcripciones ni claves en MariaDB ni se registran preguntas en consola. Los últimos seis intercambios solo están en el estado de la pestaña; el backend guarda temporalmente respuestas de reintentos idempotentes por diez minutos y las descarta al expirar la sesión. La API de OpenRouter y el proveedor subyacente procesan las solicitudes: revisar sus políticas de privacidad antes de enviar material no público.
- Prompt versión `agora.llm.prompt.v1`: el texto y los pasajes se presentan como fuentes, sin declarar automáticamente qué está a favor/en contra. Se usa la convención «virtud completa en una vida entera». Las respuestas generadas pueden equivocarse, incluso inventar relaciones; por eso se muestran las fuentes recuperadas por el servidor con ID y referencia aparte.
- Los créditos se restituyen ante errores de recuperación, red o OpenRouter; una llamada que se procesó aguas arriba pero cuya respuesta se perdió podría igualmente generar costes. El límite por IP y el límite de tokens ayudan a acotarlo.

## Instalación en Windows CMD / Git Bash

Prerequisitos: N1-U.15 y N1-U.16 corregido **ya aplicados**; Node 20+ y backend Express activo. Este incremento no necesita nuevas dependencias npm (reutiliza Express y el índice vectorial existentes).

1. Descargar `agora-n1u17-openrouter-categorias.patch` y colocarlo en la raíz del repositorio.
2. Comprobar el estado del repositorio y el parche:

```cmd
  git status --short
  git apply --check agora-n1u17-openrouter-categorias.patch
```

3. Si `--check` pasa:

```cmd
  git apply agora-n1u17-openrouter-categorias.patch
  node --test test/llm/n1u17.test.mjs
  node public/scripts/check-n1u17-ui.mjs
  node public/scripts/check-n1u16-querybuilder.mjs
  node public/scripts/check-n1u15-vectorial.mjs
  node public/scripts/check-views.mjs
```

4. Configurar la clave en el archivo `.env` **del directorio que contiene `server.js`**. El `src/config.js` existente usa `process.loadEnvFile` cuando está disponible, y lee variables del entorno:

```dotenv
OPENROUTER_API_KEY=sk-or-v1-REEMPLAZAR_LOCALMENTE
OPENROUTER_MODEL=openrouter/free
# Opcional, si Ágora corre detrás de HTTPS y un proxy:
# AGORA_PUBLIC_ORIGIN=https://mi-dominio.example
# OPENROUTER_SITE_URL=https://mi-dominio.example
```

> El valor de clave es un **marcador**, no una clave válida. No pegarla en la terminal de chat. Confirmar que `.env` está ignorado por Git y no servido como archivo estático.

5. Reiniciar el **servidor backend** para cargar la variable. Abrir `/#/lab/consultas` y pulsar **Asistente LLM**. La pantalla debe mostrar «6 de 6». Primero ensayar una pregunta sobre felicidad; luego inspeccionar `[E1]` en fuentes recuperadas. Repetir seis veces y comprobar `0 de 6`. No usar la clave en el navegador.

## Pruebas manuales sugeridas

1. «Solo categorías»: sin marcar ninguna etiqueta, el sistema no permite recuperar resultados; seleccionar una estática y una funcional y comparar Priorizar vs Restringir. El AST debe tener `query: ""`.
2. Buscar `felicidad actividad` en «Lenguaje natural», pasar a «Solo categorías» y volver: la consulta natural no debe heredar ocultamente etiquetas que se marcaron en otra pestaña.
3. Buscar una cita, pulsar «Examinar estas citas con la LLM». Ver las referencias propuestas antes de consultar. Si la revisión editorial cambia, se debe rechazar la generación y no gastar cupo.
4. Realizar una generación «Lectura guiada» y otra «Contrastar una interpretación»; inspeccionar respuesta, fuentes y modelo efectivamente empleado.
5. Retirar temporalmente `OPENROUTER_API_KEY` y reiniciar backend: el chat debe indicar configuración ausente. No hay llamada externa ni decremento.
6. Verificar que `/api/llm/session` no expone la clave y que el navegador no hace solicitudes directas a `openrouter.ai`.

## Comprobaciones realizadas y pendientes

- **Comprobado localmente:** 8 tests unitarios de pasarela y comprobación de composición de interfaz simulada (sesiones, concurrencia, reintentos, validación de fuentes y revisión, fallos y seguridad del origen), motor N1-U.15 y Query Builder N1-U.16. No se realizaron llamadas con una clave real ni pruebas contra tu MariaDB.
- **Pendiente en tu instalación:** prueba visual completa en navegador, confirmación del modelo elegido con tu cuenta OpenRouter, flujo HTTP backend real, cookie y proxy de despliegue, verificación de costes/cuota en el panel de OpenRouter.
- **Antes de abrir a público:** autenticación y cupos persistentes por usuario/perfil, presupuesto total y alertas de proveedor, protección de abuso distribuida y evaluación editorial de las respuestas (N1-U.18).
