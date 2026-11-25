# Ágora · N1-U.15 · Explorador vectorial de citas

## Alcance

Nuevo experimento **en el Laboratorio especializado**, en `http://localhost:<puerto>/labo/#/vectorial` (sustituir puerto por el de la aplicación). No modifica MariaDB, las fichas, las FAQ ni el motor de diálogo. El Lab anterior de búsqueda/constructor permanece en `#/buscar`.

### Objetivo filosófico

Permitir localizar citas en párrafos y subunidades que ayuden a examinar críticamente una lectura editorial o de un especialista. Dos consultas pueden formularse en paralelo para buscar **candidatos de evidencia** y **candidatos para una lectura alternativa**. Ni una posición alta ni la coincidencia de etiquetas demuestran que un pasaje apoye o refute una tesis. La clasificación de pertinencia, apoyo, objeción y contexto es una operación interpretativa que queda a cargo del editor o lector.

### Índice y fuentes

- `GET /api/labo/lectura` (unidades, subunidades y revisión documental desde MariaDB).
- `GET /api/texto/EN_libro1_v8.txt` (párrafos bilingües y anclas del Libro I). La relación subunidad↔párrafo se deriva de anclas localizadas por el lector ya existente; no se asignan etiquetas de párrafo sin procedencia.
- `/lab/n1u5-fichas-explicativas.json`, `/lab/n1u6-puentes-explicativos.json`, `/lab/n1u7-fichas-red-piloto.json` (fichas y apoyos seleccionados editorialmente). Si su revisión difiere de la documental, se desactivan enlaces y filtro por ficha.
- Las categorías estáticas provienen de `conceptos_clave` de cada subunidad y las funcionales de `movimientos`. No se crean categorías desde palabras sueltas del texto. El corpus del Labo suministra las etiquetas legibles si están disponibles.

### Algoritmo experimental

Índice local disperso de TF-IDF con frecuencia sublineal e IDF suavizado; similitud coseno sobre títulos, introducciones y pasajes castellanos/griegos. Se ponderan títulos por repetición, coincidencias de frase y categorías seleccionadas. La opción **priorizar** suma señales editoriales y la opción **filtrar** exige al menos una etiqueta por cada familia activa. Se muestran por separado coseno, frase y aporte de etiquetas. **No es un modelo de embeddings**, ni un verificador de tesis, ni una medida probabilística de verdad.

Una ficha o FAQ puede limitar la búsqueda a subunidades explícitamente elegidas como apoyos; los párrafos aparecen solo cuando hay anclas que los conectan con esas subunidades. Los documentos fuera de este alcance no se califican como irrelevantes: sencillamente no se incluyen en ese filtro.

### Prueba manual

1. Abrir `/labo/#/vectorial`; comprobar que el laboratorio anterior conserva su pestaña de búsqueda y el constructor.
2. Buscar `felicidad actividad` en *Subunidades y párrafos*. Desplegar una cita bilingüe, inspeccionar componentes del puntaje y el origen de sus categorías.
3. Seleccionar la ficha «¿Qué es la felicidad?» y repetir; ahora se muestran solo sus apoyos editoriales y párrafos asociados por anclas.
4. Agregar una categoría estática y una funcional; comparar el modo «Aumentan prioridad» con «Filtran resultados».
5. En «Consulta alternativa» escribir `placer honor riqueza`. Comprobar que el bloque de contraste no afirma que los resultados sean objeciones.
6. Exportar el JSON de resultados; verificar revisión, consulta, filtros, puntajes y referencias. Repetir después de recargar la página.
7. Cambiar la revisión documental (si corresponde): los vínculos de fichas de otra revisión deben desactivarse hasta publicar una revisión coherente.

### Instalación (CMD o Git Bash)

Con N1-U.14 instalado, descargar `agora-n1u15-explorador-vectorial.patch` y ejecutar desde la raíz del repositorio:

```cmd
 git apply --check agora-n1u15-explorador-vectorial.patch
 git apply agora-n1u15-explorador-vectorial.patch
 node public/scripts/check-n1u15-vectorial.mjs
```

No aplicar si falla `--check`. Este parche solo toca `public/labo/index.html` y `public/labo/js/main.js` y añade archivos nuevos. No toca `labArchitectureView.js` ni el CSS de fichas; evita los conflictos de versiones experimentados anteriormente.

### Validación y límites

Pruebas de motor, filtros, anclaje de párrafos, ranking explicable, vinculación de fichas y sintaxis JavaScript. El índice corre en el navegador sobre la respuesta de la API actual. **Quedan pendientes** la validación visual en el navegador del usuario, la verificación con MariaDB activa y la evaluación de precisión por especialistas.

## Contrato futuro del chat LLM (N1-U.17)

- **Seis interacciones con la LLM por sesión de uso** durante el piloto; definir explícitamente en interfaz qué consume un crédito y cuántos quedan.
- Un intercambio con generación efectiva consume un crédito. Consultar fichas, texto, grafos, buscar citas y utilizar el Query Builder no consume créditos LLM. Las llamadas rechazadas o fallidas no se contabilizan como interacciones consumidas (con transacciones seguras y prevención de duplicados).
- La autorización y el contador deben mantenerse **del lado del servidor**, con sesión firmada y un decremento atómico y auditable **antes de la llamada cobrable**, con restitución si falla. Sin cuentas autenticadas, el límite por sesión es solo experimental y no impide reiniciar identidad; para créditos por usuario requerimos autenticación y almacenamiento duradero.
- Denegar nuevas generaciones cuando se agota el cupo, antes de gastar tokens. Mantener claves API en backend. Limitar presupuesto por solicitud y duración, aplicar rate limiting independiente, no registrar conversaciones privadas innecesariamente y limitar el corpus enviado a evidencia recuperada.
- Para principiantes, priorizar pasajes y preguntas de reflexión antes de ofrecer generación automática; para avanzados, modos de exploración adicionales. Patrocinios o suscripciones futuros no cambiarán la distinción entre textos editoriales y respuestas generadas.

## Próximos hitos

N1-U.16: comparación de consultas naturales, constructor visual, patrones de grafos estilo Cypher y un DSL híbrido Ágora, todos compilados a una representación común y un intérprete seguro. N1-U.17: LLM controlada mediante API y cupo inicial de seis. N1-U.18: evaluación de recuperación y respuestas con juicio editorial. Después: contrato de tagueo del Libro II y primeras fichas entre libros.
