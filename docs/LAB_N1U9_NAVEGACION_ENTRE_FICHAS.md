# Ágora · N1-U.9 · Navegación entre fichas

Se aplica sobre N1-U.8. Conserva siete fichas y ocho relaciones editoriales de N1-U.7, sin alterar MariaDB, las FAQ publicadas, sus trayectos, ni las subunidades.

## Cambios

1. `wheelSensitivity` efectivo **0.60**, solicitado para rueda y trackpad. Los límites `minZoom`/`maxZoom` permanecen iguales. Se conserva la constante histórica `ZOOM_SENSITIVITY_TRIPLE` de N1-U.8 para comparación.
2. Cada ficha dispone de una sección compacta y plegable **Conexiones con otras fichas (N)** en su inspector. Presenta solo aristas curatoriales realmente registradas en el recurso de N1-U.7; distingue dirección, nombre, extremo y explicación.
3. **Abrir ficha** navega directamente al otro extremo de esa arista; **Ver relación en la red** devuelve a la red con la arista seleccionada para inspección.
4. **← Anterior** aparece después de navegar desde una ficha a otra mediante sus relaciones. El botón **Red de fichas** devuelve al mapa y resalta la ficha de origen, si existe. No se agregan nodos, subgrafos ni capas visuales permanentes.
5. El selector modal de fichas, el inspector, la navegación de pasajes bilingües y el encuadre conservado permanecen disponibles.

## Instalación

```powershell
git apply --check "$env:USERPROFILE\Downloads\agora-lab-arquitectura-n1u9.patch"
git apply "$env:USERPROFILE\Downloads\agora-lab-arquitectura-n1u9.patch"
node public/scripts/check-lab-arquitectura-n1u9.mjs
```

**Prueba sugerida:** abrí «¿Qué es la felicidad?» desde la red, desplegá sus conexiones, seguí «Argumento del érgon», probá «Anterior», y desde una conexión elegí «Ver relación en la red». Repetí con «Partes del alma» → «Tipos de virtudes». Comprobá el zoom con rueda.

**Validación:** pruebas estáticas, de datos, escape HTML y aplicación del parche sobre la reconstrucción local de N1-U.8. La validación visual en tu instalación y MariaDB activa sigue pendiente.
