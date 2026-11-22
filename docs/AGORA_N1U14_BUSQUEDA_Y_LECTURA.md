# Ágora · N1-U.14 · Búsqueda sobre fichas + lectura bilingüe

## Alcance

Primer puente desde la sección pública de fichas hacia la recuperación del antiguo Lab, **sin sustituir todavía el motor de búsqueda del corpus**. Este incremento no modifica MariaDB, fichas, FAQ ni las relaciones de sus grafos.

### Buscador de fichas

- Se añade un panel plegable «Buscar una explicación entre las siete fichas» en `/#/fichas`.
- Índice local de 7 fichas: los recursos editoriales `/lab/n1u5-fichas-explicativas.json` y `/lab/n1u7-fichas-red-piloto.json` deben corresponder a la misma revisión. No se descarga otro corpus y no se infieren nuevas aristas.
- Vectorización TF-IDF **dispersa** con pesos adicionales en títulos y ranking por similitud coseno. No emplea embeddings de modelos generativos ni constituye una búsqueda semántica profunda. Solo encuentra coincidencias de términos del material explicativo.
- Al elegir un resultado, se abre la ficha por su ID editorial original (sin duplicar una ficha). Se muestran los términos coincidentes, no una falsa medida de certeza filosófica.
- Enlace al Lab histórico `/labo/#/buscar`, con la misma consulta ya incorporada. Ese Lab continúa ofreciendo su API de búsqueda en fragmentos y criterios (`/api/labo/buscar`) y es independiente del índice local.
- Las cuatro fichas nuevas continúan marcadas como borrador.

**Pendiente de la integración integral**: reunir resultados de fichas y pasajes del corpus con trazabilidad de revisión y subunidad, evaluar relevancia de los rankings y estudiar embeddings reales solo si aportan valor frente a los criterios editoriales existentes.

### Lectura bilingüe

- La proporción de columnas pasa a **1,7 : 1** (castellano/griego, aproximadamente 63 %/37 %) en Biblioteca, lector de citas y respaldo de las fichas.
- Párrafos justificados, fuente monoespaciada y griego politónico sin ligaduras tipográficas. Se utiliza la primera tipografía disponible del equipo; no se distribuyen fuentes.
- Pantallas estrechas (750 px o menos): se apilan castellano y griego con encabezados independientes para evitar columnas ilegibles.
- Biblioteca y lector de pasajes incorporan A− / A+ entre 14 y 30 px (valor inicial 18). Comparten el almacenamiento `agora.lab.arquitectura.lectura.v1` de N1-U.12; al guardar el tamaño se conservan `graphFont` y `showEdgeNames`.
- Los controles tipográficos propios del lector dentro de fichas N1-U.12 permanecen disponibles.

## Instalación desde CMD

Con **N1-U.13** ya instalado, guardá el parche en la raíz del repositorio:

```cmd
git apply --check agora-n1u14-busqueda-lectura.patch
git apply agora-n1u14-busqueda-lectura.patch
node public/scripts/check-n1u14-busqueda-lectura.mjs
```

No ejecutar el segundo comando si falla `--check`.

## Pruebas manuales

1. `/#/fichas`: expandir la búsqueda y escribir «partes del alma». Debe aparecer la ficha sobre el alma. Elegirla y comprobar la selección del grafo. Repetir con «¿Qué es la felicidad?».
2. Abrir el Lab anterior desde la búsqueda; comprobar que conserva la consulta en la URL. El antiguo motor puede requerir el servidor y MariaDB activos.
3. `/#/reading`: abrir Libro I / capítulo 1. El castellano debe ocupar más espacio que el griego, los párrafos deben estar justificados y A− / A+ debe actualizar el tamaño.
4. Abrir un pasaje desde una ficha o cita: verificar mismas proporciones y tamaño guardado.
5. Reducir el ancho de la ventana a menos de 750 px y comprobar que se apilan las lenguas.
6. Abrir el Lab de fichas y comprobar que permanecen sus controles de grafo, expansión y `wheelSensitivity: 0.60`.

Las pruebas de Node comprueban integridad estática del puente, resultados TF-IDF, inmutabilidad de fichas, fuentes bilingües y persistencia de preferencias. **No sustituyen pruebas de UI en tu navegador ni la API conectada a MariaDB.**
