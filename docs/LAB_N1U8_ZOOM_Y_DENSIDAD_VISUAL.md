# Ágora · Checkpoint N1-U.8 · Zoom y densidad visual

Se aplica **después de N1-U.7**, sin modificar las fichas, sus anclajes, relaciones editoriales, las FAQ originales ni MariaDB.

## Cambios

1. El zoom con rueda de Cytoscape pasa de `wheelSensitivity: 0.16` a `0.48`: exactamente **3×** la sensibilidad previa, tanto para acercar como para alejar. Se mantienen los límites `minZoom: 0.22` y `maxZoom: 2.5`. En trackpads puede variar la percepción según sistema/navegador.
2. Se reemplaza la banda permanente de siete botones de fichas por **Elegir ficha…**, que abre un `<dialog>` nativo. Tiene siete botones de tamaño uniforme, selección con teclado, cierre con `Esc`, botón de cierre y fondo oscuro. Se conserva **Red de fichas** como botón de retorno visible.
3. El diagrama y el inspector ganan espacio: cabecera y barras compactas, contexto filosófico contraído inicialmente pero desplegable, tres perspectivas compactas, leyenda y estado editorial en desplegables. En escritorio el grafo pasa a ocupar una mayor proporción del ancho y del alto de la ventana; el inspector sigue disponible con desplazamiento propio. En móvil, las columnas se apilan.
4. La vista de Cytoscape conserva el **zoom y desplazamiento actual** al inspeccionar nodos/aristas del mismo grafo. Al cambiar de red/ficha/perspectiva, ejecuta un nuevo `fit`. La lectura bilingüe no restaura forzosamente el zoom predeterminado al volver.

## Instalación (Windows, PowerShell)

Desde el repositorio **con N1-U.7 aplicado**:

```powershell
git apply --check "$env:USERPROFILE\Downloads\agora-lab-arquitectura-n1u8.patch"
git apply "$env:USERPROFILE\Downloads\agora-lab-arquitectura-n1u8.patch"
node public/scripts/check-lab-arquitectura-n1u8.mjs
node public/scripts/check-lab-arquitectura-n1u7.mjs
```

Abrí `/#/lab/arquitectura` y verificá las siete fichas en el modal, el botón **Red de fichas**, los tres enfoques de cada ficha, el encuadre tras seleccionar nodos y el zoom en ambas direcciones con rueda o trackpad.

## Alcance de pruebas

Validación estática y tests Node sin navegador ni MariaDB. Queda pendiente comprobar el comportamiento visual en la instalación del usuario con Cytoscape y la API reales.
