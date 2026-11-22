# Checkpoint 6 — Títulos selectivos para aristas del visor

Incremento **sobre el Checkpoint 5** (persistencia de disposiciones), sin cambiar MariaDB ni los datos editoriales.

## Comportamiento

- **Vista focal por defecto:** las aristas foco-foco siguen resaltadas por grosor y color, pero **sus textos no aparecen automáticamente**. Tampoco aparecen `foco_faq`, ni los de las demás relaciones. Esto evita la saturación.
- **Clic sobre arista → inspector lateral:** se muestran los datos originales (ID, tipo, relación, procedencia, referencias y extremos) y un nuevo campo «Título visible de esta arista».
- **Aplicar título:** guarda un alias de presentación en memoria y habilita su etiqueta inmediatamente, con un máximo de 100 caracteres. Se utiliza siempre el **ID de la arista**, no el par origen/destino: dos relaciones entre los mismos conceptos pueden tener alias distintos.
- **Ocultar / mostrar etiqueta:** no borra el título; permite recuperar la misma etiqueta posteriormente.
- **Restablecer original:** elimina el título personalizado, conserva la propiedad editorial original y **no altera** la preferencia de mostrar/ocultar para esa arista.
- **Mostrar nombres de todas las aristas:** interruptor optativo para inspección. Mientras está activo, no es posible ocultar individualmente una etiqueta. Desmarcarlo restaura la vista selectiva.
- **Persistir ordenamiento:** guarda las posiciones, los IDs individuales de aristas visibles, los títulos personalizados y el interruptor global en la **misma entrada del Checkpoint 5** de `localStorage`, determinada por conjunto de focos y huella estructural.
- **Recuperar ordenamiento guardado:** restaura títulos y selección de etiquetas, además de las posiciones. No se guarda nada hasta presionar «Persistir ordenamiento».
- **Compatibilidad:** disposiciones anteriores sin `titulos` siguen funcionando. Las etiquetas que se activaron individualmente en el Checkpoint 5 siguen visibles. La nueva regla «solo algunas etiquetas» afecta las aristas focales que antes mostraban su nombre automáticamente.

## Comprobación

```bash
git apply --check agora-visor-cytoscape-checkpoint6-titulos-aristas.patch
git apply agora-visor-cytoscape-checkpoint6-titulos-aristas.patch
node public/scripts/check-visor-titulos-aristas.mjs
node public/scripts/check-visor-disposiciones.mjs
node public/scripts/check-visor-expansion.mjs
node public/scripts/check-visor-filtros.mjs
node public/scripts/check-identidad-visor.mjs
```

En `/#/lab/visor-grafos`:
1. Seleccionar `arete`, `eudaimonia` y `phusis`; confirmar que las aristas foco-foco estén destacadas **sin texto** por defecto.
2. Hacer clic en una conexión de una FAQ (antes todas rotuladas `foco_faq`), escribir «Pregunta sobre la virtud» y pulsar **Aplicar título**.
3. Rotular otra arista, ocultar una etiqueta y mostrarla de nuevo; la personalización debe sobrevivir.
4. Mover nodos y pulsar **Persistir ordenamiento**; recargar el navegador o cambiar de focos y volver. Las etiquetas seleccionadas y títulos deben restaurarse.
5. Pulsar **Restablecer original**, luego guardar: el alias desaparece, pero `tipo`, `relacion`, `referencia` y `fuente` siguen íntegros.
6. Probar «Mostrar nombres de todas las aristas»: la saturación es una opción *explícita*, no el estado inicial.

## Límites

Los títulos son **personales a la disposición focal**, no forman parte del corpus compartido; cambiar de conjunto de focos puede recuperar una selección diferente. No se sincronizan entre equipos. En Cytoscape las aristas no tienen «posiciones» propias independientes: se guardan los títulos y su visibilidad, mientras que su geometría depende de las posiciones de los nodos.

La UI requiere comprobación real en el navegador; las pruebas de Node verifican lógica, persistencia y compatibilidad, pero no un clic físico sobre Cytoscape.
