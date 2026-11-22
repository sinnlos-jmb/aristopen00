# Ágora — Checkpoint 1: visor genérico de grafos (Cytoscape.js)

## Propósito

Probar un solo renderer para **cualquier** proyección `{nodes, edges}` de Ágora, sin utilizar Relate/Neo4j, migrar MariaDB ni alterar el Orientador V2. Ruta `/#/lab/visor-grafos` desde el Laboratorio. La fuente sigue siendo `/api/contenido`; el visor es estrictamente de lectura.

## Instalación local (Windows / Git Bash / PowerShell)

Desde la raíz del proyecto:

```bash
npm --prefix public install --no-save --ignore-scripts cytoscape@3.34.4
node public/scripts/preparar-cytoscape.mjs
node public/scripts/check-visor-generico.mjs
npm --prefix public run test:views
```

El segundo comando copia **el bundle minificado y la licencia MIT** a `public/vendor`. Este último directorio debe incluirse en el commit para que Ágora funcione sin conexión. La versión está fijada en 3.34.4 y se verifica antes de copiar. Si falta el bundle, la vista explica cómo instalarlo; el resto de Ágora sigue funcionando.

## Prueba de uso

1. Abrir `/#/lab/visor-grafos`. La vista inicial está **agregada por tipo** para evitar una maraña de 1.981 aristas de entrada.
2. Elegir «Mostrar universo completo»; se renderizan todos los nodos y vínculos de la proyección. Usar zoom, paneo y arrastre de un nodo.
3. Seleccionar un nodo o una arista para inspeccionar el identificador y procedencia. Doble toque/clic sobre nodo: ocultar en este visor; «Restaurar ocultos» para verlo nuevamente.
4. Buscar `phusis`, seleccionar el resultado y comprobar que el visor pasa al universo completo y centra el nodo hallado. La identidad está separada: `concepto_estatico:phusis` y `nodo_funcional:phusis` siguen siendo entidades distintas.
5. Filtrar por un tipo de nodo y volver a «Todos». En una vista filtrada, las aristas cuyos extremos no están visibles también se ocultan; no se borran de la proyección.
6. Cerrar la ruta y volver: no hay ediciones ni ocultamiento persistente.

## Criterios del checkpoint

- Conteo del modo completo coincide con el inventario (salvo cambios en los datos de origen).
- Distingue visualización agregada de grafo original.
- Permite arrastrar nodos, mover lienzo, zoom, inspeccionar, ocultar y restaurar sin tocar los datos.
- Adaptador `semanticGraphAdapter.js` no depende de Cytoscape ni del navegador y tiene pruebas.
- Librería se carga sólo en el Laboratorio; errores de instalación no rompen rutas existentes.
- **No implementado aún:** separación definitiva en Inventario / Vecindad, persistencia de poda didáctica, control de roles, búsquedas Cypher, comparación semántica o editor de grafos.

## Nota de diseño

En el resumen por clases, un vínculo representa un **recuento** de vínculos reales entre dos tipos de nodos. No representa una nueva afirmación filosófica ni tiene la semántica de cada arista individual. En el universo completo, las flechas corresponden a las direcciones registradas en la proyección.
