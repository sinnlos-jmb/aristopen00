# Ágora · N1-U.16 · Laboratorio principal de consultas multimodales

**Estado:** experimento de solo lectura; no publica FAQ, modifica etiquetas ni escribe en MariaDB.

## Qué cambia

- Una tarjeta propia **Consultas y recuperación** en `/#/lab` abre `/#/lab/consultas`. No hace falta entrar en `/labo/` para utilizar el índice de N1-U.15.
- Se importa el **mismo motor** `public/labo/js/vectorial-engine.js` de N1-U.15: TF-IDF y coseno léxico, no embeddings neuronales.
- Cuatro modos de expresar la pregunta: lenguaje natural; constructor visual con etiquetas estáticas y funcionales; patrón de grafo tipo Cypher; DSL híbrido inspirado en SQL.
- Los cuatro compilan a un AST normalizado y verificable (`agora.query.v1`). El intérprete jamás ejecuta SQL arbitrario ni envía cadenas de consulta técnica al backend.
- Para consultar relaciones de fichas, se usan solo aristas explícitas de `n1u7-fichas-red-piloto.json`. El motor no convierte coincidencias temáticas en relaciones filosóficas.
- Una búsqueda muestra el desglose del ranking, texto bilingüe, coincidencias y enlaces a fichas cuando existe anclaje editorial de la misma revisión.

## Fuentes y compatibilidad

Requiere N1-U.15 instalado. Utiliza:

1. `GET /api/labo/lectura` (unidades, subunidades y revisión activa de MariaDB).
2. `GET /api/texto/EN_libro1_v8.txt` (texto griego y castellano).
3. `/lab/n1u5-fichas-explicativas.json`, `/lab/n1u6-puentes-explicativos.json` y `/lab/n1u7-fichas-red-piloto.json`.

Las conexiones y los filtros por ficha **solo se habilitan si coinciden todas las revisiones editoriales**. En caso de diferencia, la búsqueda textual continúa operativa sin presentar enlaces hipotéticos como evidencia válida.

## Sintaxis admitida

### Natural

> ¿Qué relación hay entre actividad, virtud y felicidad?

Se trata como consulta de recuperación textual; puede complementarse con filtros visuales. No se usa todavía una LLM para interpretarla.

### Visual

Se seleccionan tipo de pasaje, ficha/FAQ, categorías estáticas y funcionales, modo de ponderación y límite. Etiquetas de párrafo: **proyección desde subunidades por anclas verificadas**, no etiquetado canónico del párrafo.

### Grafo tipo Cypher (subconjunto)

```cypher
MATCH (f:Ficha)-[:RELACIONADA_CON]->(g:Ficha)
WHERE f.id = 'faq.lab.felicidad' RETURN f, g
SEARCH 'actividad virtud'
```

Admite únicamente un patrón dirigido de fichas y el tipo `RELACIONADA_CON`, un origen por ID, un retorno de variables presentes en el patrón y una cláusula `SEARCH` opcional. Sin `SEARCH`, devuelve solo relaciones editoriales; no inventa citas rankeadas. No es Cypher completo ni depende de Neo4j.

### Híbrido SQL/grafos (subconjunto)

```sql
SELECT PASAJES WHERE TEXTO CONTAINS 'felicidad actividad'
AND TIPO = 'parrafo'
AND FICHA = 'faq.lab.felicidad'
AND ESTATICA = 'arete'
AND FUNCIONAL = 'definicion'
AND MODO = 'restrict'
LIMIT 12
```

La sintaxis admite `SELECT PASAJES`, `WHERE TEXTO CONTAINS '…'`, cláusulas `AND` restringidas a `TIPO`, `FICHA`, `ESTATICA`, `FUNCIONAL`, `MODO`, y `LIMIT`. No acepta joins, SQL general, DDL/DML, subconsultas, condiciones dinámicas ni ejecución remota de código. `FICHA` aplica un alcance por subunidades expresamente seleccionadas en las fichas.

## Riesgos interpretativos y ampliaciones

- `lógos`/`logos` puede significar razón, argumento o discurso. El prototipo **advierte la ambigüedad** sin pretender inferir su sentido. Se propone un futuro identificador `sense:logos#razon`, `sense:logos#argumento`, etc. con apoyo griego y revisión editorial, sin activarlo en el ranking actual.
- El puntaje léxico no es probabilidad de corrección filosófica ni clasifica un pasaje como prueba favorable o adversa de una lectura.
- Este trabajo facilita N1-U.17 (chat LLM mediante API) pero no incorpora todavía llamadas a ninguna LLM ni sistema de créditos. Mantener seis generaciones por sesión como cupo futuro del piloto, controlado en backend.
- El antiguo `/labo/` permanece instalado como referencia y para recuperar otros experimentos todavía no migrados. **No se elimina todavía** para evitar pérdida de funciones.

## Instalación CMD / Git Bash

Con N1-U.15 instalado y desde la raíz del repositorio:

```cmd
git apply --check agora-n1u16-querybuilder-lab.patch
git apply agora-n1u16-querybuilder-lab.patch
node public/scripts/check-n1u15-vectorial.mjs
node public/scripts/check-n1u16-querybuilder.mjs
node public/scripts/check-views.mjs
```

Abrir `/#/lab`, seleccionar **Consultas y recuperación**. La ruta es `/#/lab/consultas`.

## Pruebas sugeridas

1. Natural: `felicidad actividad virtud`.
2. Visual: misma consulta, solo párrafos, ficha felicidad, etiqueta `arete` si figura en el catálogo y modo restringir; observar cambios en el ranking.
3. Técnico Cypher: ejecutar el ejemplo y verificar que las relaciones se limitan a aristas editoriales, no a coincidencias temáticas.
4. Híbrido: ejecutar el ejemplo, abrir la cita bilingüe y revisar la puntuación; probar `DROP TABLE` y comprobar que se rechaza.
5. Buscar `eudaimonia logos`: debe aparecer una nota de ambigüedad de sentido y no una etiqueta de razón inventada.
6. Alterar temporalmente una revisión editorial de prueba y comprobar que las relaciones de fichas se desactivan.
7. En las rutas públicas de fichas, verificar que la navegación, zoom y tipografía del lector no hayan cambiado.

## Verificaciones automáticas

`check-n1u16-querybuilder.mjs` comprueba gramáticas, rechazo de consultas peligrosas o desconocidas, coincidencia de AST entre modalidades equivalentes, alcance por apoyos de fichas, integridad de aristas y búsqueda sobre un índice sintético. Son pruebas **sin navegador ni MariaDB**, que deben complementarse con validación visual y con la API real.
