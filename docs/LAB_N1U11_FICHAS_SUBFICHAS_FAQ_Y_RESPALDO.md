# Ágora · N1-U.11 — Fichas, subfichas, FAQ y grafo estructural contextualizado

**Estado:** experimento del Lab. Sin migraciones, escrituras en MariaDB ni modificaciones a trayectos publicados.

## Decisión editorial

- **Ficha base:** explicación autónoma y reutilizable (siete fichas existentes). Constituye la unidad explicativa y de navegación, aunque sus identificadores históricos coincidan con el de una FAQ.
- **Subficha:** adaptación dependiente de **una** ficha base, con foco, justificación, pasajes elegidos entre los apoyos curatoriales de la ficha de origen y una FAQ anfitriona. **No** duplica ni modifica automáticamente la ficha base. Si una adaptación se vuelve suficientemente independiente, requerirá decisión editorial explícita para promoverla a ficha.
- **FAQ:** pregunta que **compone** referencias ordenadas a fichas y subfichas. Una FAQ puede reutilizar fichas sin reescribirlas; las subfichas registran la reinterpretación contextual. Los seis pasos de las cuatro FAQ piloto permanecen tal como estaban en N1-U.7, y las dos FAQ publicadas conservan sus trayectos de seis y cuatro pasos.

El catálogo JSON `public/lab/n1u11-catalogo-explicativo.json` tiene `fichas`, `subfichas` y `faqs` como entidades separadas. Sus IDs son editoriales de Lab, no filas nuevas de MariaDB. Incluye siete fichas base, siete composiciones FAQ y **dos subfichas de ejemplo**:

1. `subficha.etica.proemio` — encuadra el Proemio desde el carácter práctico de la investigación, para la FAQ introductoria de la Ética.
2. `subficha.felicidad.ergon` — reutiliza la explicación del argumento de la función humana desde la pregunta por la felicidad.

## Grafo estructural en la perspectiva «1 · Respaldo estructural»

Se despliegan en el mismo grafo la **ficha**, sus **macrounidades y unidades explícitamente seleccionadas** y **sus pasajes de apoyo explícitos**. Se utilizan los vínculos editoriales ya registrados en N1-U.6/N1-U.7. No se añaden nodos por coincidencias de etiquetas ni se incluyen subunidades no escogidas.

Hay dos clases de aristas:

- `contexto_ficha` (trazo curatorial): ficha → macrounidad seleccionada, con rol explicativo registrado.
- `pertenencia_estructural` (trazo gris punteado): macrounidad → unidad seleccionada y unidad → pasaje seleccionado. Esta última es **solo pertenencia documental verificable**, no una relación argumentativa ni un puente filosófico inferido.

El inspector de la ficha muestra la fundamentación de cada nodo seleccionado, ofrece lectura bilingüe y mantiene un apartado plegable de **composición de FAQ** para explorar fichas y subfichas. Las otras perspectivas, «Diagrama explicativo» y «Pasajes de apoyo», permanecen accesibles. Se conserva el guardado de posiciones N1-U.10, y el parche no toca CSS ni `wheelSensitivity`.

## Integración futura

1. Acordar identidades separadas de FAQ y ficha en MariaDB/API (hoy hay aliases históricos). Evitar romper URLs y trayectos publicados.
2. Curar la semántica de los enlaces, el nivel de justificación de cada subficha y el tratamiento de variantes académicas.
3. Incorporar la red al frontend principal después de validar la visualización en el Lab.

## Prueba local

```powershell
# Aplicar solo con N1-U.10 instalado y validado.
git apply --check "$env:USERPROFILE\Downloads\agora-lab-arquitectura-n1u11.patch"
git apply "$env:USERPROFILE\Downloads\agora-lab-arquitectura-n1u11.patch"
node public/scripts/check-lab-arquitectura-n1u11.mjs
```

Pruebas sin DB: identidad, referencias, revisión, cobertura de vínculos, HTML seguro y estructura del grafo. Pendiente validar integración visual con el servidor y MariaDB activos.
