# Ágora · N1-U.6 · Puentes explicativos entre fichas y arquitectura textual

## Decisión de diseño

El punto de entrada del lector es la **ficha filosófica** (Proemio, «¿Qué es la ética?», «¿Cómo se dice el bien?»). La base canónica (`macrounidades propuestas → unidades registradas → subunidades`) queda como **archivo de respaldo** y nunca como menú de navegación obligatorio.

Tres perspectivas secuenciales, no tres grafos superpuestos:

1. **Contexto en el Libro I**: la ficha como nodo principal; enlaces explícitamente seleccionados hacia ciertas macrounidades propuestas y unidades registradas. Las etiquetas describen *por qué la ficha remite* a esas partes. No se representa todo el árbol estructural ni se deriva un puente de una coincidencia de tags.
2. **Diagrama explicativo**: Proemio conserva sus dos resoluciones argumentativas N1-U.4 (síntesis y detalle con relaciones N1-U.3 hipotéticas); las FAQ muestran sus trayectos editoriales publicados, cuyas flechas representan orden de los pasos, **no** deducción. La estructura textual anterior se visita desde un acceso secundario «Archivo estructural del Libro I».
3. **Pasajes de apoyo**: solo vínculos explícitos **ficha → pasaje**; no se conectan automáticamente las subunidades a sus unidades. Las subunidades siguen conservando su pertenencia canónica en la API, accesible por otros medios. Un clic abre la lectura bilingüe de la subunidad validada contra el paquete de lectura activo.

El vocabulario de enlaces es editorial (`rol` y `explicacion`), no el de relaciones lógicas universalmente inferidas. Es posible que una ficha atraviese macrounidades y unidades diferentes. La ficha no reemplaza ni altera las FAQ, los trayectos publicados, las referencias Bekker, los tags ni el corpus de MariaDB.

## Primera selección manual de conexiones

- **Proemio**: macro I–V, unidad `proemio`; cuatro pasajes: `1094a1-3`, `1094a18-22`, `1094a26-b3`, `1094b7-10`.
- **FAQ Ética**: macros I–V y VIII–XII; unidades `proemio`, `metodo`, `felicidad_opiniones`, `confirmacion`; los seis anclajes ya elegidos en su trayecto publicado.
- **FAQ sobre el bien**: macros VI–VII y VIII–XII; unidades `idea_bien`, `confirmacion`; los cuatro anclajes ya elegidos en su trayecto publicado. La salida hacia `confirmacion` **no** demuestra la interpretación del bien por analogía.

Las vinculaciones a macrounidades son **propuestas editoriales** porque la propia división en macrounidades es propuesta; la identidad de las unidades y subunidades y sus relaciones de pertenencia proviene del modelo canónico. Los textos de las fichas son borradores genéricos, pendientes de contrastación con la bibliografía secundaria.

## Artefactos

- `public/lab/n1u6-puentes-explicativos.json`: declaraciones de puentes por ficha, con `rol` y justificación revisables.
- `public/js/lab/architectureBridges.js`: validación pura de identidad, revisión y correspondencia de anclajes, más grafos e inspector HTML seguro.
- `public/js/views/labArchitectureView.js`: navegación guiada por ficha y selección de perspectivas.
- `public/css/lab-arquitectura-n1u2.css`: controles de tres perspectivas y estilos de aristas, manteniendo los modos antiguos.
- `public/scripts/check-lab-arquitectura-n1u6.mjs`: pruebas sin DB de cobertura, ausencia de enlaces automáticos, procedencia, revisión y escape HTML.

## Prueba en Windows

Con N1-U.5 instalado:

```powershell
 git apply --check "$env:USERPROFILE\Downloads\agora-lab-arquitectura-n1u6.patch"
 git apply "$env:USERPROFILE\Downloads\agora-lab-arquitectura-n1u6.patch"
 node public/scripts/check-lab-arquitectura-n1u6.mjs
```

Abrir `/#/lab/arquitectura`: la ficha Proemio y su contexto deben mostrarse inicialmente. Seleccionar las otras dos fichas, alternar entre **Contexto**, **Diagrama** y **Pasajes**, y comprobar que los enlaces tienen comentarios distintos según su función. En Pasajes, inspeccionar un nodo y abrir lectura bilingüe. Luego volver al archivo estructural (acceso secundario) y comprobar que el mapa tradicional continúa disponible.

**Límites:** la prueba local opera sobre el fixture N1-U.2 y el dump editorial del 7 de noviembre de 2026; la visualización con Cytoscape real y una MariaDB activa aún requiere validación en la instalación del usuario. En esta etapa, las FAQ de los archivos no se vuelven a consultar dinámicamente en MariaDB para verificar sus versiones publicadas.
