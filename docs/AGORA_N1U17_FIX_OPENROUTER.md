# Ágora · N1-U.17 · Corrección de respuestas vacías en OpenRouter

## Síntoma

`POST /api/llm/chat` responde HTTP 502 con `OpenRouter devolvió una respuesta vacía.`

En N1-U.17 la pasarela enviaba `max_tokens: 650` y consideraba vacía una respuesta cuyo `choices[0].message.content` no incluyera texto. En los modelos con razonamiento, OpenRouter puede contabilizar el razonamiento interno dentro del mismo presupuesto de salida; si se agota, `finish_reason: "length"` y `content` puede estar vacío. También puede haber otras causas. No se puede concluir cuál ocurrió sin los metadatos del intento.

## Qué cambia

- El valor predeterminado aumenta a **1800 tokens** (presupuesto total de salida, no longitud prometida de la respuesta).
- Se puede configurar `OPENROUTER_MAX_TOKENS` en `.env`, con valores válidos **256 a 4096**. Un valor inválido restablece 1800.
- Acepta bloques `text` y `output_text` cuando `content` es una lista.
- Cuando `content` está vacío, muestra en el error **solo metadatos**: modelo, `finish_reason`, tokens generados y, si existen, tokens de razonamiento. **No muestra contenido de razonamiento interno, preguntas, claves o prompts**.
- Los fallos devuelven el cupo de la sesión, como antes; los intentos aún cuentan para el límite de seguridad por IP y podrían tener consumo del lado del proveedor.
- No se modifican `public/`, la navegación del Lab, las fichas, las categorías ni la API pública.

## Instalación

En la raíz de `aristopen`, con N1-U.17 instalado y sin cambios propios sin integrar en `src/llm/gateway.js`:

```cmd
git apply --check agora-n1u17-fix-openrouter-vacio.patch
git apply agora-n1u17-fix-openrouter-vacio.patch
node --test test/llm/n1u17.test.mjs
```

Reiniciar el servidor backend. No es necesario volver a instalar N1-U.17 ni alterar MariaDB.

Por defecto, el límite ya es 1800. Si querés ajustarlo, en el `.env` que utiliza el backend:

```dotenv
OPENROUTER_MAX_TOKENS=1800
OPENROUTER_MODEL=openrouter/free
```

`openrouter/free` elige modelos gratuitos dinámicamente, por lo que puede cambiar entre intentos. Si continúa el error, **elegí en OpenRouter un modelo específico con salida textual por chat** y reemplazá `OPENROUTER_MODEL` por su identificador exacto; reiniciá el servidor. Evitá publicar o subir la clave. No reintentes de forma indefinida: los proveedores pueden computar uso aun cuando Ágora devuelve el cupo.

### Cómo leer el próximo diagnóstico

Ejemplo ilustrativo, no corresponde a una generación real:

`OpenRouter agotó el límite de salida sin generar texto (modelo=proveedor/modelo; fin=length; tokens_salida=1800; tokens_razonamiento=1790)`

Confirma agotamiento del presupuesto de salida. Si indica `fin=stop` sin contenido, hay que revisar el modelo concreto, su modalidad de salida y los registros de OpenRouter, antes de cambiar la pasarela nuevamente.

### Validación

En una copia reconstruida de N1-U.17, pasaron **11 tests**: los 8 originales y 3 nuevos para respuestas de texto en bloques, límite de razonamiento sin contenido y respuesta vacía con otra causa. **Sin llamada real a OpenRouter** ni acceso al servidor local del usuario.
