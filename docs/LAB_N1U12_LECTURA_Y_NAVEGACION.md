# Ágora · N1-U.12 · Legibilidad, preferencias y navegación documental

**Alcance:** solo experimento `/#/lab/arquitectura`. Sin migraciones SQL, sin escritura de FAQ, fichas o trayectos, sin inferencia de nuevas aristas. Requiere N1-U.11 y el CSS complementario N1-U.10 instalado.

## Accesibilidad tipográfica

- **Grafo Cytoscape:** fuente monoespaciada con alternativas compatibles con griego politónico; tamaño inicial de 17 px ajustable de 12 a 26 px mediante `Grafo A−/A+`. El control cambia las etiquetas de nodos y aristas sin alterar coordenadas, zoom ni contenido.
- **Lector bilingüe:** fuente monoespaciada para griego y castellano; tamaño inicial de 18 px ajustable de 14 a 30 px mediante `Texto bilingüe A−/A+`; se conserva el formato de dos columnas y el resaltado del pasaje.
- **Etiquetas de aristas:** botón `Ocultar nombres / Mostrar nombres`. Se ocultan todas las etiquetas, nunca las flechas ni la semántica de la relación; el inspector mantiene títulos y justificaciones.
- Las preferencias se guardan exclusivamente en `localStorage` bajo `agora.lab.arquitectura.lectura.v1`; datos inválidos se descartan de manera segura y nunca bloquean el Lab. Son independientes de `agora.lab.arquitectura.posiciones.v1` (N1-U.10).
- No se añaden archivos de fuentes descargables ni dependencias externas.

## Expansión y contracción piloto

En `1 · Respaldo estructural` de una ficha:

- **Un clic** selecciona el nodo y actualiza el inspector derecho sin navegar a otra vista.
- **Doble clic** (dos pulsaciones rápidas sobre el mismo nodo, 360 ms) expande/contrae sus descendientes. El nodo padre queda a la vista con `[+]` cuando está contraído.
- También se puede utilizar el botón `Expandir rama / Contraer rama`, disponible tras seleccionar un nodo con descendientes. Sirve como alternativa accesible al gesto.
- Solo se atraviesan `contexto_ficha` y `pertenencia_estructural`, conexiones documentales explícitas. La red de siete fichas y las aristas argumentativas no se modifican ni se contraen de forma automática.
- El estado de expansión es **temporal por ficha**, no se guarda en MariaDB ni se incluye en la exportación de posiciones. Las posiciones ya guardadas de nodos ocultos no se eliminan.
- Para las otras vistas se mantienen los gestos anteriores mientras se prueba la usabilidad de este modelo.

## Instalación en CMD o PowerShell

Desde la raíz del repositorio, con N1-U.11 instalado:

CMD:

```cmd
 git apply --check "%USERPROFILE%\Downloads\agora-lab-arquitectura-n1u12.patch"
 git apply "%USERPROFILE%\Downloads\agora-lab-arquitectura-n1u12.patch"
 node public/scripts/check-lab-arquitectura-n1u12.mjs
```

PowerShell:

```powershell
 git apply --check "$env:USERPROFILE\Downloads\agora-lab-arquitectura-n1u12.patch"
 git apply "$env:USERPROFILE\Downloads\agora-lab-arquitectura-n1u12.patch"
 node public/scripts/check-lab-arquitectura-n1u12.mjs
```

**Nunca aplicar si `git apply --check` informa errores.** Por falta de fuentes completas de N1-U.9, el parche se verificó sobre la reconstrucción disponible N1-U.2→N1-U.8→N1-U.10 (sin CSS)→N1-U.11, no contra tu instalación exacta; revisar el contexto si surgiera una diferencia.

## Validación y siguientes pasos

- Prueba Node N1-U.12: proyección de los siete grafos, selección solo de pasajes explícitos, árbol sin aristas colgantes, preferencia local, límites y reversibilidad, CSS.
- Pruebas previas: N1-U.2 a N1-U.8, N1-U.10 con su CSS de instalación y N1-U.11 en la reconstrucción local.
- **Pendiente:** verificación visual de las fuentes griegas disponibles en Windows, gestos de Cytoscape, respuesta de zoom y navegación en tu servidor MariaDB.
- Próximo: extender/ajustar gesto a otros grafos si el piloto funciona, unificar contexto y ficha en interfaz principal y auditar accesibilidad móvil y de teclado.
