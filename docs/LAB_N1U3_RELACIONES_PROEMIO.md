# Ágora · Checkpoint N1-U.3 — Relaciones argumentativas del Proemio

**Base requerida:** N1-U.2 sobre la versión de Ágora con lector bilingüe 9B. Incremento de solo lectura; **no aplica migraciones ni escribe en MariaDB**.

## Acceso y uso

1. Abrir `/#/lab/arquitectura`.
2. Seleccionar `I–V → Proemio: el bien y la política`.
3. En la barra del grafo, alternar **Momentos** y **Relaciones propuestas**.
4. En *Relaciones propuestas*, se muestran las 12 subunidades del Proemio con 10 flechas argumentativas propuestas. Cada flecha es dirigida, tiene título propio, clasificación editorial y fundamento. Ninguna procede de una inferencia automática de continuidad o de relaciones conceptuales existentes.
5. Pulsar una arista para inspeccionar su origen, destino y justificación; los botones **Leer origen** y **Leer destino** invocan el mismo lector bilingüe de N1-U.2.
6. Pulsar un nodo para revisar su título, referencia Bekker e incidencia con las relaciones propuestas. La subunidad final `1094b10-11` aún no recibe arista en esta versión: esto no constituye una tesis sobre su función.
7. Volver a **Momentos** o navegar a otras unidades. Su representación canónica no se modifica.

## Proveniencia

- Fuente canónica en tiempo de ejecución: `/api/labo/lectura`, con `revision`.
- Momentos N1-U.2: `/lab/n1u1-propuestas-libro-i.json`.
- Hipótesis N1-U.3: `/lab/n1u3-relaciones-proemio.json`.
- Las referencias Bekker y títulos de las doce subunidades coinciden con la exportación incorporada en N1-U.2. El archivo de prueba de N1-U.2 **no** incorpora las introducciones editoriales completas: los fundamentos de N1-U.3 son **propuestas interpretativas**, destinadas a contrastarse con la lectura de ambos idiomas antes de cualquier validación.
- Todas las relaciones tienen `estado=propuesta_no_validada`, y `construirRelacionesProemio()` rechaza estado, revisión o extremos incompatibles. No se promueven automáticamente.
- Las cuatro macrounidades y las articulaciones previas se conservan. La traducción acordada es «virtud completa en una vida entera».

## Aristas propuestas

| ID | Nombre | Origen → destino |
|---|---|---|
| r01 | distingue formas de fin | 1094a1-3 → 1094a3-6 |
| r02 | abre pluralidad de fines | 1094a3-6 → 1094a6-9 |
| r03 | ordena fines | 1094a6-9 → 1094a9-16 |
| r04 | acota la jerarquía | 1094a9-16 → 1094a16-18 |
| r05 | plantea el fin último | 1094a9-16 → 1094a18-22 |
| r06 | motiva su búsqueda | 1094a18-22 → 1094a22-24 |
| r07 | formula el programa | 1094a22-24 → 1094a24-26 |
| r08 | identifica el saber rector | 1094a24-26 → 1094a26-b3 |
| r09 | determina el bien humano | 1094a26-b3 → 1094b4-7 |
| r10 | amplía la escala política | 1094b4-7 → 1094b7-10 |

Estas flechas no equivalen a relaciones de implicación lógica demostrada: son propuestas de lectura, con orientación textual y función dialéctica que deben ser discutidas filosóficamente.

## Comprobaciones

En la raíz del repositorio, **después de aplicar N1-U.2**:

```powershell
git apply --check "$env:USERPROFILE\Downloads\agora-lab-arquitectura-n1u3.patch"
git apply "$env:USERPROFILE\Downloads\agora-lab-arquitectura-n1u3.patch"
node public/scripts/check-lab-arquitectura-n1u2.mjs
node public/scripts/check-lab-arquitectura-n1u3.mjs
node public/scripts/check-visor-lectura-9b.mjs
```

Las pruebas locales usan el fixture de la exportación N1-U.2; no requieren MariaDB ni conexión de red. La comprobación del lector 9B requiere el código completo de Ágora, que no está incluido en este parche. Quedan pendientes la verificación de carga en el navegador, Cytoscape y lectura griega/castellana contra tu servidor y MariaDB activos.
