# Ágora · Orientador V2 — Evaluación piloto (incremento 3)

## Objetivo

Evaluar con colegas **el proceso de determinación de la pregunta**, antes de conectar trayectos, tags, grafos o FAQ. Una sesión «conforme» indica cierre voluntario, no exactitud de la interpretación ni calidad filosófica de una respuesta.

## Protocolo sugerido

1. Invitar inicialmente a un grupo pequeño de colegas (por ejemplo, 5–8); aclarar que se ensaya un orientador experimental y que la participación es voluntaria.
2. Cada participante escribe 2–3 preguntas *propias*, sin copiar sugerencias. Como casos de control separados, probar «¿Qué es la naturaleza?» y «¿Cuáles son las diferencias entre disposición, virtud y felicidad?».
3. Completar o abandonar la orientación con libertad. No presentar `phusis` como origen obligatorio.
4. Al cerrar, responder **opcionalmente** tres preguntas: claridad de las aclaraciones, fidelidad de la consulta final e influencia percibida de las sugerencias. Añadir un comentario breve sin datos personales.
5. Exportar el JSON de la sesión o usar **Registrar voluntariamente**. Guardar la evaluación en la sesión no transmite datos al servidor: el POST solo ocurre al pulsar Registrar. Si se registra antes de evaluar, la evaluación añadida después no actualiza ese registro.

## Campos nuevos y resguardo de interpretación

- `trazabilidadIntencion` (sesión exportada): comparación descriptiva entre `interpretacion.operacion` y `consulta.intencion`; conserva `precisionInicial`, lista conceptos que no se retomaron y señala `distincionPendiente` si se pasa de `distinguir` a `relacionar`. No atribuye causalidad al bot ni equipara ambas operaciones.
- `evaluacionPiloto`: objeto **opcional** (`version:1`, `claridad`, `fidelidad`, `influencia`, `comentario`) validado en navegador y servidor.
- `consulta_json` (MariaDB): solo después del registro voluntario, puede contener `evaluacionPiloto` y `trazabilidadIntencion`; esta última se **recalcula** en servidor desde los campos validados. No hay migración.
- La bitácora sigue terminando en `cierre`. Una evaluación posterior se adjunta por separado y no altera el historial ni presupone conformidad.
- No se recoge identidad en el formulario. El texto libre puede contener datos personales si alguien los escribe; solicitar expresamente que no los incluya. No difundir JSON individuales sin revisar su contenido.

## Análisis descriptivo (sin dashboard)

Desde `public/`:

```bash
node scripts/resumir-orientador-piloto.mjs ../sesion1.json ../sesion2.json
```

También acepta un archivo JSON con un arreglo de sesiones. Devuelve frecuencias de intención conservada/distinta, distribución de opciones de evaluación, origen elegido y casos donde la distinción se convirtió en relación. **No imprime preguntas ni comentarios**. Las frecuencias de una muestra voluntaria no estiman resultados poblacionales ni explican por qué cambió una pregunta.

## Verificación

```bash
npm --prefix public run test:orientador
npm --prefix public run test:views
node --test src/test/user-queries.test.mjs src/test/user-queries-v2.test.mjs src/test/user-queries-piloto.test.mjs
cd e2e
npx playwright test tests/orientador-piloto.spec.mjs
```

### Criterio para cerrar el piloto

Revisar con los colegas los casos en que la consulta final no representa la inquietud inicial, especialmente `distinguir → relacionar`, y los casos donde una opción sugerida parece haber cambiado el objetivo. Documentar ajustes menores de interfaz antes de iniciar una **capa semántica separada** que recupere definiciones y sentidos editoriales, tags de subunidades, aristas dirigidas con evidencia, y FAQ candidatas, sin convertir coincidencia léxica ni tags de párrafo en prueba textual.
