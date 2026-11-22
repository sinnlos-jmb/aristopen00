# Ágora · N1-U.5 · Fichas explicativas de grafos

## Propósito

Primer ensayo de **mediación filosófica textual** en el Lab de Arquitectura argumentativa (`/#/lab/arquitectura`). No crea, modifica ni publica FAQ, trayectos, aristas ni unidades en MariaDB; se limita a mostrar tres fichas de lectura asociadas a diagramas existentes o a trayectos editoriales recuperados de la exportación.

## Tres fichas

1. **El Proemio: acción, bienes y política**. Introducción a praxis, poiesis y theoria como *marco externo*, bienes y fines, problema condicional del fin último y dimensión política. Usa los **4 módulos** y **3 enlaces proyectados** de N1-U.4. La capa detallada de **12 subunidades y 10 aristas** de N1-U.3 permanece accesible.
2. **¿Qué es la ética? ¿Por dónde comienzo?**. Conserva ID `faq.etica.intro`, referencia al trayecto publicado `tr.faq.etica.intro`, sus **6 pasos** y sus anclas a subunidades.
3. **¿Cómo se dice el bien? Hacia uno y por analogía**. Conserva ID `faq.agathon.pros_hen`, referencia al trayecto publicado `tr.faq.agathon.pros_hen`, sus **4 pasos** y anclas; la unidad del bien por referencia a uno o analogía permanece como pregunta abierta en EN I.6, no como tesis ya demostrada.

Las dos FAQ y sus 10 pasos proceden de `dump-aristotle-OK-202611072119.sql` (exportación del 7 de noviembre de 2026). La **secuencia y los títulos de subunidades** se presentan conforme al modelo N1-U.2 derivado de MariaDB; la interfaz **no recupera dinámicamente desde MariaDB los textos completos de los trayectos** en esta etapa. Si cambia el corpus y la revisión, el Lab detiene la combinación de recursos. Una fase posterior deberá contrastar además las versiones publicadas de FAQ/trayectos en vivo antes de mostrar la ficha como plenamente sincronizada.

## Diferenciar tipos de aristas

- **Proemio**: las aristas entre módulos tienen fundamento en relaciones N1-U.3 explícitas, aún **no validadas**. La segunda capa permite leer esas relaciones y sus extremos.
- **FAQ**: la flecha punteada de un paso al siguiente indica **secuencia del trayecto editorial publicado**, no causalidad, inferencia, justificación ni continuidad textual entre pasajes contiguos. Los comentarios nuevos explican por qué puede resultar pedagógico ese salto, sin modificar el trayecto original.

Todo comentario, marco o explicación N1-U.5 está marcado como **borrador pedagógico pendiente de curaduría**. Ningún comentario se atribuye a Berti, Owens, Kraut, Pakaluk, Gómez-Lobo o Vigo sin documentación específica. Los títulos/IDs de FAQ proceden de la exportación; las explicaciones son redacción original genérica y revisable.

## Archivos

- `public/lab/n1u5-fichas-explicativas.json`: contenido pedagógico y metadatos de trayectos recuperados. Sus `sub_id` coinciden con los identificadores canónicos de N1-U.2.
- `public/js/lab/architectureCards.js`: validación pura, generación de nodos/aristas de FAQ, presentación del marco filosófico y de inspectores.
- `public/js/views/labArchitectureView.js`: añade el selector de tres fichas, panel de texto y representación de las FAQ con Cytoscape existente; preserva modos, navegación y lector bilingüe previos.
- `public/css/lab-arquitectura-n1u2.css`: estilos de fichas y categorías gráficas.
- `public/scripts/check-lab-arquitectura-n1u5.mjs`: verificación estructural sin DB ni navegador.

## Prueba manual

1. Abrir Lab → Arquitectura argumentativa → **Proemio**. Leer la introducción, explorar Capa 1 y la arista «Plantea el fin último». Abrir Capa 2 y verificar que R05 permanece intacta.
2. Seleccionar **¿Qué es la ética?**. Deben verse **6 nodos y 5 flechas de orden de trayecto**. Al elegir un nodo se lee un comentario preliminar y se ofrece el pasaje bilingüe.
3. Seleccionar **¿Cómo se dice el bien?**. Deben verse **4 nodos y 3 flechas de orden**; inspeccionar el paso 3 y comprobar que `πρὸς ἕν` y analogía se muestran como alternativas interrogativas. Comprobar que el paso 4 no se rotula como conclusión deducida del paso 3.
4. Volver a **Libro I** y confirmar que la navegación estructural no se modificó.

## Comprobaciones locales

```powershell
node public/scripts/check-lab-arquitectura-n1u2.mjs
node public/scripts/check-lab-arquitectura-n1u3.mjs
node public/scripts/check-lab-arquitectura-n1u4.mjs
node public/scripts/check-lab-arquitectura-n1u5.mjs
node public/scripts/check-visor-lectura-9b.mjs
```

Las primeras cuatro pruebas pueden ejecutarse sin MariaDB. La inspección visual y la correspondencia con los datos vivos siguen pendientes de prueba en el repositorio del usuario. Esta entrega debe aplicarse **sobre N1-U.4**.
