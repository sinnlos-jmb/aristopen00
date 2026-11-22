# Checkpoint 7 — FAQ agrupadas y filtros de tipos

Se aplica **sobre el Checkpoint 6**. Solo modifica el visor. No edita datos de MariaDB, el corpus editorial, el Orientador ni el auditor.

## Qué hace

- En vista focal, al detectar **dos o más FAQ no focales** conectadas por `foco_faq` con un mismo concepto visible, sustituye su dibujo por un nodo `FAQ (n)` y una conexión **visual** punteada. No la presenta como una relación semántica. La agrupación se calcula sobre la vecindad visible; no añade FAQ externas a esa vecindad.
- Doble clic en el nodo `FAQ (n)` o botón del inspector despliega las FAQ y sus aristas reales. El agrupador permanece visible, de modo que el segundo doble clic vuelve a plegarlas. Si el usuario elige una FAQ como foco, esa FAQ nunca se oculta dentro de un grupo.
- El inspector enumera las preguntas agrupadas. El usuario puede ocultar/mostrar categorías: conceptos estáticos, nodos funcionales propios, FAQ, unidades, definiciones. Nunca se ocultan los **focos**, aunque se desmarque su categoría.
- Los filtros son de **presentación**, posteriores a la selección de la vecindad. No alteran índices, identidad ni reglas de expansión. Las subunidades siguen fuera del grafo y los párrafos conservan su checkbox independiente.
- `Persistir ordenamiento` conserva posiciones, títulos y etiquetas de aristas, y además el estado de los filtros y de las FAQ desplegadas. `Recuperar ordenamiento guardado` los restaura. Los registros antiguos del checkpoint 5/6 mantienen compatibilidad.

## Pruebas

```bash
node public/scripts/check-visor-faq-grupos.mjs
node public/scripts/check-visor-titulos-aristas.mjs
node public/scripts/check-visor-disposiciones.mjs
node public/scripts/check-visor-expansion.mjs
node public/scripts/check-visor-filtros.mjs
node public/scripts/check-identidad-visor.mjs
```

## Comprobación manual

1. En `/#/lab/visor-grafos`, abrir focos que tengan dos o más FAQ vinculadas a un mismo concepto; verificar un único nodo `FAQ (n)`.
2. Doble clic para desplegar; verificar que se conservan los IDs y aristas FAQ originales. Doble clic para plegar.
3. Desmarcar «Preguntas FAQ» y volver a marcar; verificar que ningún concepto foco desaparece.
4. Editar título de una arista existente, mover nodos, desplegar FAQ, cambiar filtros y pulsar «Persistir ordenamiento»; recargar y comprobar restauración.
5. Comprobar que `foco_faq` y otras relaciones originales siguen intactas en el inspector una vez desplegadas.

**Limitación deliberada:** no se agrupan FAQ que comparten solamente texto o etiquetas de párrafo; únicamente las vinculadas por conexiones `foco_faq` existentes y visibles. La lectura contextual y el despliegue de unidades/párrafos se reservan al siguiente checkpoint.
