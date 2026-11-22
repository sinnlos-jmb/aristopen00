# Ágora · N1-U.10 · Textos ↔ grafos y disposición persistente

**Estado:** experimento del Lab, sin escrituras en MariaDB, sin cambios en FAQ/trayectos publicados.

## Propósito

La ficha es una explicación inteligible para el lector. Sus pasos editoriales se vinculan
con los nodos de un grafo y con pasajes escogidos expresamente. Las macrounidades,
unidades y subunidades continúan siendo infraestructura de respaldo, no el orden
de presentación predeterminado. No se deducen enlaces por coincidencia de tags.

## Disposición de nodos

- La red de las siete fichas adopta una **aproximación a la captura editorial** proporcionada:
  Ética arriba; Proemio/Bien en segundo nivel; Felicidad al centro; Virtudes/Érgon debajo;
  Alma al pie. La imagen no contiene las coordenadas exactas de Cytoscape.
- Arrastrar un nodo modifica el diseño *en esta sesión*.
- **Guardar disposición** conserva las posiciones del grafo en el almacenamiento local del navegador,
  bajo `agora.lab.arquitectura.posiciones.v1`. Esta operación no envía datos al servidor.
- **Diseño → Restaurar disposición inicial** restaura únicamente la vista actual.
- **Diseño → Exportar JSON / Importar JSON** permite hacer una copia y transferir
  la organización a otro navegador o computadora. La importación valida esquema,
  tamaño, tipos, finitud y rango de coordenadas; no importa nodos/aristas editoriales.
- Se guardan posiciones de todos los tipos de grafo que el usuario haya modificado,
  pero solo se aplican si los IDs de nodo coinciden con los actuales.
- El botón **Ajustar grafo** sigue recalculando el encuadre sin cambiar posiciones.

## Explicación y grafo sincronizados

1. Al abrir una ficha-FAQ, el inspector muestra una **lectura guiada** compacta con 4/6
   pasos según la ficha. El texto de cada paso proviene del comentario editorial ya existente.
2. Pulsar un número selecciona el nodo del trayecto. Seleccionar el nodo del grafo
   actualiza el texto mostrado en la guía.
3. **Ubicar pasaje en grafo** cambia a la perspectiva de apoyos y selecciona únicamente
   el pasaje que esa ficha ya vinculaba editorialmente. **Ver contexto estructural**
   localiza su unidad en el grafo de contexto cuando esa unidad está explícitamente vinculada.
4. Desde un pasaje seleccionado, **Volver al paso explicativo** devuelve al texto y
   al nodo correspondiente. La lectura bilingüe se mantiene intacta.
5. En Proemio, los cuatro módulos tienen una guía equivalente basada en la función
   argumentativa ya registrada en la propuesta N1-U.4.

## Ruta de instalación

Este archivo forma parte del parche incremental sobre N1-U.8/N1-U.9. Se recomienda
probar en la instancia real con N1-U.9 instalado:

```powershell
git apply --check "$env:USERPROFILE\Downloads\agora-lab-arquitectura-n1u10.patch"
git apply "$env:USERPROFILE\Downloads\agora-lab-arquitectura-n1u10.patch"
node public/scripts/check-lab-arquitectura-n1u10.mjs
```

Nota de validación: se reconstruyó y comprobó el código N1-U.8 con las fuentes disponibles.
El parche original de N1-U.9 no estaba disponible para verificar *exactamente* ese estado;
comprobar `git apply --check` en el repositorio actualizado antes de aplicar.

## Trabajo posterior

- Curaduría filosófica de las transiciones entre fichas, pasos y unidades.
- Revisar la claridad visual del texto/diagrama con usuarios.
- Diseñar un registro editorial versionado de conexiones entre fichas y grafos
  estructurales, sin convertir etiquetas tentativas en relaciones canónicas.
- Solo después, integrar estas perspectivas en la aplicación principal.
