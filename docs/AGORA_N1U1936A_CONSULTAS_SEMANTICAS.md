# Ágora · N1-U.19.3.6a — Consultas semánticas y contexto verificable

## Alcance

Primer paso de 19.3.6. Requiere el contrato 19.3.5e y el expediente 19.3.5f ya instalados. La referencia remota consultada es `updating`, catálogo `public/lab/n1u1935e-nucleos-semanticos.json`, blob `17b8df98f7fae0e69a0635684bb3792b769dcef6`. El expediente 19.3.5f fue recuperado de la entrega anterior local, no del remoto. Se agrega una tarjeta independiente del Laboratorio y no se altera el intérprete previo de fichas. Sin cambios en MariaDB, textos, árboles, catálogo, estados, proveedor LLM o rutas de chat. No es Cypher completo ni un motor Neo4j. No ejecuta ni envía nada a OpenRouter.

## Gramática de solo lectura

```cypher
MATCH (n:Nucleo)-[:CONTIENE]->(m:Manifestacion)-[:MANIFIESTA]->(c:Concepto) WHERE c.uid = 'estatico:logos' RETURN n, m, c LIMIT 20
MATCH (n:Nucleo)-[:CONTIENE]->(a:Manifestacion)-[:RELACION_CONTEXTUAL]->(b:Manifestacion) WHERE n.id = 'n04' RETURN n, a, b LIMIT 20
MATCH (n:Nucleo)-[:FUNDAMENTADO_EN]->(e:Evidencia) WHERE n.id = 'n04' RETURN n, e LIMIT 20
MATCH (n:Nucleo)-[:CONTINUA_CON]->(s:Nucleo) WHERE n.id = 'n04' RETURN n, s LIMIT 20
```

Cada línea es una consulta independiente. Variables, etiquetas y tipos fijos; palabras clave y IDs distinguen mayúsculas. Se admite formato multilínea y `LIMIT` opcional (1–50; 20 por defecto). No se admiten escrituras, concatenación de consultas, filtros arbitrarios, inversión, transitividad ni caminos no registrados. El intérprete recorre registros JSON validados, no una base de grafos externa. Las relaciones locales conservan sus tipos, familia contextual, voz, dirección, justificación y estado; las transiciones son continuaciones editoriales, no deducciones. Las notas de retorno/apertura se leen del incremento 5f. Los sentidos candidatos conservan su estado y referencia; no sustituyen el campo `sentido`.

## Resultados de referencia para la prueba local

Cotejo directo del catálogo remoto: 16 núcleos, 54 manifestaciones, 22 transiciones; `estatico:logos` devuelve ocho manifestaciones (n02, n11, n12 tres, n13, n16 dos), de las cuales la palabra de n16 es implícita y candidata a lenguaje. n04: tres relaciones locales, dos evidencias, tres continuaciones (n08 fortuna, n09 vida mortal, n14 felicidad como principio). Los números pueden variar si el corpus cambia. No se ha ejecutado el navegador contra MariaDB activa. Las pruebas del paquete usan una fixture sintética para comprobar el intérprete; la prueba del catálogo completo se ejecuta cuando esté disponible localmente.

## Contexto para el futuro LLM

El visor obtiene los datos activos por `/api/labo/lectura` y el texto bilingüe por `/api/texto/EN_libro1_v8.txt`, comprueba los validadores históricos y el contrato, las referencias, anclas de párrafo, ausencia de duplicación de numeración de párrafos y la revisión. Bloquea ante incidencias. Calcula SHA-256 de los bytes de la respuesta de texto con Web Crypto (requiere contexto seguro, por ejemplo localhost); si difiere del hash histórico o no está disponible, permite revisar consultas con referencias resueltas, pero impide exportar el paquete de contexto. No certifica offsets exactos de subunidad, verdad filosófica, equivalencias entre revisiones o ediciones. El identificador documental sigue 5f: `EN:1:p27`. Los UIDs de manifestación y evidencia tienen alcance de catálogo (núcleo/ID local e índice respectivamente); los índices no son identificadores globales inmutables.

Exportación JSON `agora.semantic-context.v1`: pregunta opcional (máximo 1000 caracteres), consulta ejecutada, revisión activa/histórica, archivo y hash, estado, total y truncado, filas con su procedencia, propuestas de sentidos relevantes y párrafos bilingües completos deduplicados. Máximo 12 filas y 60.000 caracteres; reducir LIMIT si se supera. El ancla seleccionada no necesariamente fundamenta toda la formulación; la traducción es del párrafo, no del fragmento. El expediente es inspeccionable y no se envía automáticamente al servidor ni al LLM. Un JSON exportado por cliente no es autoridad documental: en 19.3.6b el servidor deberá reconstruir y validar el contexto a partir de identificadores y fuentes activas antes de cualquier llamada al proveedor. No aceptar instrucciones de documentos recuperados ni referencias inventadas por el LLM. La formulación «virtud completa en una vida entera» permanece intacta.

## Instalación y prueba

Desde la raíz del repositorio, con 19.3.5f instalado:

```bat
git apply --check agora-n1u1936a-consultas-semanticas.patch
git apply agora-n1u1936a-consultas-semanticas.patch
node --test public/scripts/check-n1u1936a.mjs
```

Recargar con Ctrl+F5 y abrir Laboratorio → Consultas semánticas (`/#/lab/consultas-semanticas`). Elegir lógos, ejecutar y comprobar las ocho filas; inspeccionar n16 y su carácter candidato. Elegir las tres consultas de n04; comprobar límites, voces, referencias y nota de apertura al fin en n04/n14. Probar una consulta inválida (por ejemplo `DELETE n`), que debe rechazarse. Exportar contexto si el hash coincide; abrir el JSON y comprobar sus fuentes. Si hay incidencias, no eludir el bloqueo; informar el mensaje. La ruta usa la clave del catálogo de experimentos, que es la que registra el router actual.

Validación de la entrega: 9 pruebas de modelo con fixture superadas; una adicional sobre catálogo real se omite en el entorno de preparación y se ejecuta en la instalación. Cotejo de resultados esperado realizado independientemente contra JSON remoto. Sintaxis JS comprobada. Aplicación/reversión verificadas contra fragmentos de `lab.js` y archivos nuevos, no contra un clon completo ni un navegador real. No se modificó GitHub. Reversión (si no se editaron los archivos nuevos): `git apply -R --check agora-n1u1936a-consultas-semanticas.patch` y `git apply -R agora-n1u1936a-consultas-semanticas.patch`.

## Próximos incrementos

19.3.6b: recuperación semántica del lado servidor, planificación acotada mediante la gramática, reconstrucción documental independiente, referencias de respuesta comprobables, diálogo OpenRouter y auditoría. 19.3.6c: selección opcional de continuaciones y retorno a principios/apertura a fines, sin clasificar al interlocutor ni convertir hipótesis en hechos. 19.4: grafos sincrónicos de fichas. No adelantar una migración al Libro II hasta resolver identidad y segmentación.
