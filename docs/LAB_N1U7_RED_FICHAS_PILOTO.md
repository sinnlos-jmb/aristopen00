# Ágora · N1-U.7 · Siete fichas filosóficas y red navegable

## Cambio de enfoque

Las **fichas explicativas son la puerta de entrada**; los grafos internos y la infraestructura de unidades/subunidades son evidencias y recorridos de apoyo. No se derivan conexiones de coincidencias de etiquetas ni de pertenencia mecánica. Esta etapa **no modifica** MariaDB, las FAQ existentes, sus trayectos publicados ni el lector bilingüe.

## Siete fichas en el Lab

Fichas anteriores, preservadas:

1. `proemio` — «El Proemio: acción, bienes y política» (cuatro módulos, dos resoluciones).
2. `faq.etica.intro` — «¿Qué es la ética? ¿Por dónde comienzo?» (trayecto publicado de seis pasos en el dump).
3. `faq.agathon.pros_hen` — «¿Cómo se dice el bien? Hacia uno y por analogía» (trayecto publicado de **cuatro** pasos en el dump; no se alteró ni se rellenó artificialmente hasta seis).

Cuatro **fichas-FAQ de síntesis nuevas**, únicamente en borrador Lab:

| ID provisional | Pregunta | Seis anclajes Bekker reales | Macrounidades propuestas |
| --- | --- | --- | --- |
| `faq.lab.felicidad` | ¿Qué es la felicidad? | `1095a17-20`, `1095a20-26`, `1097a34-b6`, `1097b20-21`, `1098a16-18`, `1100a3-5` | I–V, VI–VII, VIII–XII |
| `faq.lab.ergon` | ¿En qué consiste el argumento de la función propia (*érgon*)? | `1097b22-25`, `1097b25-28`, `1097b33-1098a3`, `1098a3-5`, `1098a8-12`, `1098a16-18` | VI–VII |
| `faq.lab.alma` | ¿Cuáles son las partes del alma? | `1102a5-7`, `1102a26-28`, `1102a32-1102b2`, `1102b14-18`, `1102b28-31`, `1103a1-3` | XIII |
| `faq.lab.virtudes` | ¿Qué tipos de virtudes hay? | `1102a13-18`, `1102b13-14`, `1102b33-1103a1`, `1103a1-3`, `1103a3-7`, `1103a7-10` | XIII |

Cada ficha nueva lleva introducción, lectura del diagrama, referencias iniciales, seis pasos con título y comentario, cinco transiciones explicativas y vínculos editoriales explícitos a macrounidades, unidades y pasajes. **Cada paso es un nodo, sin subgrafos de premisas/objeciones por ahora.** Las transiciones son la secuencia pedagógica propuesta; no se presentan como inferencias probadas.

La base ya contiene otras FAQ específicas (`faq.eudaimonia.definicion`, `faq.eudaimonia.completa`, `faq.ergon.humano`, `faq.psuche.partes`, etc.). Estas fichas son **síntesis introductorias adicionales**, no modificaciones ni nuevos registros persistentes de esas FAQ. Sus identificadores `faq.lab.*` son provisionales. La futura publicación en MariaDB requiere una decisión editorial de identidad, versionado y relación con las FAQ existentes.

## Red piloto de siete fichas

Se muestra de entrada en `/#/lab/arquitectura`. Contiene **siete nodos y ocho aristas dirigidas con nombre y explicación**:

- Ética → Proemio: *sitúa la investigación*.
- Proemio → Felicidad: *plantea el fin humano*.
- Ética → Sentidos del bien: *abre el problema del bien*.
- Sentidos del bien → Felicidad: *distingue planos del bien*, sin deducción semántica.
- Felicidad → Érgon: *pide una determinación*.
- Érgon → Alma: *motiva examinar el alma*.
- Alma → Virtudes: *fundamenta la clasificación*.
- Virtudes → Felicidad: *precisa la excelencia*.

Estas aristas **no se infieren** de los 175 pasajes, los tags o la mera posición textual. Su dirección y fundamento son hipótesis editoriales revisables. Al seleccionar un nodo o flecha, el inspector permite consultar su explicación y abrir una ficha; desde ella se accede a **Contexto / Diagrama / Pasajes**, conservando las vistas anteriores y el archivo estructural en un acceso secundario.

## Archivos

- `public/lab/n1u7-fichas-red-piloto.json`: ficha-FAQ, seis pasos, puentes, y ocho relaciones curatoriales. Recurso autocontenido, editable sin tocar JS, con `revision` del snapshot.
- `public/js/lab/architecturePilotNetwork.js`: expansión y validación estricta, grafo/inspector de red; HTML escapado.
- `public/js/lab/architectureCards.js`: inspector capaz de distinguir propuestas de trayectos publicados, preservando la semántica original de ambas FAQ anteriores.
- `public/js/views/labArchitectureView.js`: carga del recurso, red inicial navegable y acceso a las siete fichas.
- `public/css/lab-arquitectura-n1u2.css`: mejora del selector con las siete preguntas.
- `public/scripts/check-lab-arquitectura-n1u7.mjs`: test sin MariaDB que revisa IDs, cobertura, 4×6 pasos, 4×5 transiciones, 7 nodos/8 aristas, seguridad, versiones y ausencia de mutación de la fuente.

## Instalación (Windows, PowerShell)

Desde la raíz del repositorio, **con N1-U.6 instalado**:

```powershell
git apply --check "$env:USERPROFILE\Downloads\agora-lab-arquitectura-n1u7.patch"
git apply "$env:USERPROFILE\Downloads\agora-lab-arquitectura-n1u7.patch"
node public/scripts/check-lab-arquitectura-n1u7.mjs
```

Abrir `/#/lab/arquitectura`, seleccionar «Red de fichas», elegir «¿Qué es la felicidad?», alternar las tres perspectivas y entrar en su «Diagrama explicativo», luego seleccionar el sexto paso y abrir lectura bilingüe. Repetir con Alma y Virtudes y verificar el retorno a la red.

**Límites:** se validó con el fixture obtenido de la exportación `/api/labo/lectura` (revisión `3e94a2a6…`, dump 2026-11-07). La visualización real con Cytoscape, el navegador y MariaDB de la instalación del usuario debe verificarse allí; cambios de revisión producirán un rechazo antes de combinar versiones incompatibles.
