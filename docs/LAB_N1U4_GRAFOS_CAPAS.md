# Ágora · N1-U.4 · Grafos por capas en el Proemio

## Objetivo

Ensayo de **contracción y despliegue** de un mismo grafo argumentativo, sin modificar entidades ni relaciones de MariaDB. Conserva la ruta `/#/lab/arquitectura` y los modos previos.

- **Estructura textual** (N1-U.2): macrounidades, unidades, momentos y subunidades con relaciones de pertenencia. No atribuye argumentación por proximidad.
- **Capa 1 · módulos** (N1-U.4): cuatro nodos con función argumentativa, agrupando 3 + 2 + 2 + 5 subunidades. Tres aristas propuestas entre módulos, cada una respaldada por una arista de N1-U.3: A→B / `r03`, B→C / `r05`, C→D / `r07`.
- **Capa 2 · subunidades** (N1-U.3 reorganizado): doce nodos en cuatro contenedores visuales, diez aristas propuestas. Siete de esas aristas son internas a un módulo y las otras tres cruzan módulos.

Los cuatro módulos coinciden en **cobertura** con los momentos propuestos de N1-U.2, pero reciben un nombre que explicita su función; **no** reemplazan ni validan esos momentos. La proyección de aristas es calculada exclusivamente a partir de los extremos explícitos de N1-U.3. No se derivan aristas de la mera sucesión de los textos. La inclusión de la subunidad `1094b10-11` no inventa una arista para ella.

## Procedencia y límites

- `public/lab/n1u4-modulos-proemio.json`: nombres de módulos y funciones como **propuesta editorial no validada**, con la revisión de MariaDB de la exportación N1-U.2.
- `public/js/lab/architectureLayers.js`: valida esa revisión, las coberturas, la coincidencia con los momentos originales y proyecta las diez aristas de N1-U.3.
- Los nodos de las subunidades y sus títulos son consultados a la API existente; no se copian en el nuevo recurso.
- Un módulo puede incluir pasajes con aristas internas y otros aún sin arista propuesta; no debe interpretarse la falta de flecha como falta de función filosófica.
- No se ha comprobado todavía el comportamiento visual sobre la instalación real del usuario ni con MariaDB activa; las pruebas usan la fixture acotada existente.

## Uso

1. Abrir Lab → Arquitectura argumentativa (`/#/lab/arquitectura`). Seleccionar **I–V → Proemio: el bien y la política**. La selección inicial abre Capa 1.
2. Hacer clic en un módulo para inspeccionar su función y el conjunto de subunidades.
3. Hacer clic en la flecha **«plantea el fin último»** entre B y C. La ficha indica expresamente la relación subyacente `r05` y permite desplegarla en Capa 2.
4. Abrir **Capa 2 · subunidades**, seleccionar `1094a18-22` o la arista `r05`, y acceder desde el inspector al texto bilingüe.
5. Hacer clic en un contenedor de módulo para regresar a la Capa 1 enfocada en ese módulo. En cualquier momento se puede volver a la vista estructural original.

## Comprobación

```powershell
node public/scripts/check-lab-arquitectura-n1u2.mjs
node public/scripts/check-lab-arquitectura-n1u3.mjs
node public/scripts/check-lab-arquitectura-n1u4.mjs
node public/scripts/check-visor-lectura-9b.mjs
```

Probar la interfaz en la instalación propia, sobre todo legibilidad y zoom de la capa detallada, antes de declarar aprobado el diseño. La formulación **«virtud completa en una vida entera»** permanece intacta.
