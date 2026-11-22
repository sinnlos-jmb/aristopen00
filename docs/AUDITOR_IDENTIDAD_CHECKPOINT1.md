# Ágora · Auditor de identidad y tagueo — Checkpoint 1

## Propósito y alcance

Auditoría complementaria, solo lectura, para estudiar la correspondencia entre el árbol estático, el grafo funcional y las etiquetas del corpus. Se concentra en la **identidad canónica** y en la **integridad de referencias**; nunca convierte una vecindad en evidencia filosófica.

Archivos:
- `public/js/lab/identityTaggingAudit.js`: función pura `auditarIdentidadYTagueo(bundle)`.
- `public/scripts/auditar-identidad-tagueo.mjs`: CLI que consulta `/api/contenido` o lee un bundle JSON.
- `public/scripts/check-identidad-tagueo.mjs`: prueba sin DB ni red.
- `docs/CONTRATO_TAGUEO_PROXIMOS_CAPITULOS_V1.md`: convenciones editoriales y pendientes de arquitectura multilibro.

No añade rutas, tablas, dependencias npm ni cambios a la V2 del Orientador o al visor. Tampoco modifica el validador existente: `public/tagueo/js/validar.js` sigue siendo imprescindible para revisar anclas, tramos y otras reglas del texto bilingüe.

## Uso

Desde la raíz de Ágora, con la API funcionando:

```bash
node public/scripts/check-identidad-tagueo.mjs
node public/scripts/auditar-identidad-tagueo.mjs --url http://localhost:3000/api/contenido --out auditoria-identidad.json
```

O con una exportación JSON **completa** del bundle de `/api/contenido`:

```bash
node public/scripts/auditar-identidad-tagueo.mjs --file contenido.json --out auditoria-identidad.json --strict
```

`--strict` devuelve código de salida 1 si hay errores estructurales; **no** falla por revisiones editoriales. Salida JSON: `resumen`, `identidades`, `remisiones`, `hallazgos`. Si falla una lectura/red, código 2.

## Línea base histórica (volcado de MariaDB, 7 de noviembre de 2026)

Se reconstruyó una vista de sus conceptos, funcional, unidades, subunidades, relaciones y tags de párrafo. El auditor encontró:

| Medida | Valor |
|---|---:|
| Conceptos estáticos | 221 |
| Nodos funcionales | 67 |
| IDs compartidos | 58 |
| Solo estáticos / solo funcionales | 163 / 9 (6 son categorías funcionales) |
| Remisiones explícitas | 38 |
| Aristas funcionales | 80 |
| Unidades / subunidades / párrafos | 13 / 175 / 52 |
| Relaciones de subunidad / destinos referidos a arista | 124 / 60 |
| Tags por nivel `central` / `presente` / `mencion` | 154 / 340 / 117 |
| Estados de párrafo | 52 `propuesto` |
| Errores en las reglas de este auditor | **0** |
| Revisiones terminológicas detectadas | **7** |

**Los 7 casos para revisión editorial** corresponden a diferencias en el campo griego de conceptos compartidos: `ariston`, `endoxa`, `ergon_funcion`, `ethos`, `makarion`, `orektikon`, `threptikon`. Una diferencia ortográfica, léxica o morfológica no es necesariamente un error: comprobar el uso del texto antes de corregir.

**No confundir el resultado con un corpus validado:** esta auditoría NO comprueba si los tags se ajustan a lo que dice cada pasaje; para ello se requiere lectura editorial. Tampoco ejecuta las reglas de `validar.js` sobre los textos griego/castellano. El volcado es anterior a los últimos cambios locales del repositorio.

## Siguiente checkpoint propuesto

1. Confirmar este informe contra la API actual de Ágora.
2. Resolver las 7 diferencias terminológicas como equivalencia permitida, matiz o error corregible.
3. Probar una proyección conceptual unificada en memoria para `phusis`, `arete`, `eudaimonia`, `energeia`, `techne` sin borrar facetas ni alterar IDs fuente.
4. Ampliar la validación con una muestra editorial de párrafos y comparar resultados con el tagueo actual.
5. Acordar el identificador multilibro antes de iniciar el próximo libro.
