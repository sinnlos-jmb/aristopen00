# Ágora · Checkpoint 9A.2 — Organización del explorador textual

Este checkpoint se aplica **después de 9A.1**, sin modificar MariaDB ni incorporar el lector 9B.

## Disposición contextual

- El botón **Guardar disposición textual** guarda explícitamente los cambios de posición y las expansiones del modal usando el mismo almacenamiento local versionado por huella y conjunto de focos del visor.
- **Recuperar guardada** reconstruye el modal con el último estado persistido de esa combinación de focos y elemento consultado. Los cambios intermedios no sobrescriben el estado guardado.
- El grafo principal no recibe nodos documentales y no se modifica al reorganizar unidades y subunidades.

## Agrupadores personales

1. Seleccionar una unidad o subunidad en el modal, pulsar **Elegir para agrupar**, y repetir con otros elementos.
2. Escribir un nombre en la barra inferior y pulsar **Crear grupo**.
3. El agrupador cerrado sustituye visualmente sus elementos (y, en caso de unidad, las subunidades que cuelgan de ella); el doble clic permite abrirlo y cerrarlo.
4. En el inspector del agrupador se puede **Renombrar** y **Desagrupar**. La información editorial original se conserva.
5. Las posiciones conocidas permanecen guardadas durante agrupaciones y expansiones.

Los agrupadores no alteran el parentesco editorial unidad/subunidad. Por simplicidad, el primer incremento limita a 12 grupos por consulta y a 100 miembros por grupo. El formato previo `exploradoresTexto` sigue siendo válido.

## Flechas: qué representan y qué NO representan

- `vincula`: ancla de la consulta → unidad. Proyección de vínculos documentales y asociaciones de indexación ya identificados en 9A; el inspector de unidad distingue la procedencia.
- `contiene`: unidad → subunidad. Pertenencia editorial registrada.
- `sigue en texto`: unidad → siguiente unidad **solo si son consecutivas en el orden total** de `tags.unidades` y ambas están visibles.
- `continúa`: subunidad → siguiente subunidad **solo si son consecutivas dentro de su unidad**.
- `agrupa`: conexión de presentación creada por el usuario.

Las flechas del orden de lectura **no son relaciones causales, lógicas o filosóficas**. No se deducen conexiones conceptuales nuevas de la mera sucesión; las futuras relaciones dirigidas filosóficas entre unidades/subunidades exigirán datos editoriales explícitos que identifiquen ambos extremos y la clase de relación.

## Focos orientativos

Los focos del grafo inicial aparecen en el modal en una franja superior, acompañados exclusivamente por aristas funcionales originales que los conecten directamente. Los elementos de orientación no son seleccionables ni expandibles. La consulta textual sigue centrada en un único concepto, FAQ o arista funcional seleccionada.

## Pruebas

```sh
node public/scripts/check-visor-texto-9a2.mjs
node public/scripts/check-visor-contexto-9a1.mjs
node public/scripts/check-visor-texto-9a.mjs
node public/scripts/check-visor-disposiciones.mjs
node public/scripts/check-visor-controles-8b.mjs
```

Prueba manual: abrir `/#/lab/visor-grafos`, explorar las unidades de areté, reordenar y guardar, crear un agrupador de unidades y subunidades, cerrar/abrirlo, recuperar disposición; repetir desde otro foco y comprobar que las posiciones no se transfieren. Validar las etiquetas y flechas dirigidas. El navegador real y los datos actuales de MariaDB deben verificarse en la instalación del usuario.
