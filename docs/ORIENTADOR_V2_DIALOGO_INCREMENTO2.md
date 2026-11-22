# Ágora · Orientador V2 — Incremento 2: continuidad de la pregunta

## Motivo

El incremento 1 mostraba correctamente tres conceptos y una hipótesis de comparación, pero el paso siguiente preguntaba «¿Qué tema querés explorar?» y agregaba otras opciones ajenas a la pregunta. Eso obligaba a reconstruir una consulta ya formulada.

## Nuevo contrato de diálogo

1. El texto inicial permanece **íntegro** (`textoInicial`) y se mantiene la interpretación contextual (`interpretacion`), provisional.
2. Cuando hay varios conceptos reconocidos, se pregunta **por cuál empezar**, ofreciendo *solo* los conceptos de la pregunta. Elegir uno fija `consulta.tema` como punto de partida, **sin eliminar los restantes**.
3. Luego se pregunta qué operación realizar sobre ese punto de partida: definición, cualidades, comparación, relación, fundamento, génesis, etc. Si se reconoció una operación inicial, se destaca como **hipótesis**, no se impone.
4. Si se elige `relacionar` o `distinguir`, y el punto de partida pertenece a la pregunta original, `consulta.conceptosRelacionados` se completa con **todos los demás conceptos ya mencionados**. No se vuelve a pedir un `destino` redundante. Las relaciones son **solicitadas**, no aristas verificadas.
5. Si falta un concepto de destino (pregunta original uniconceptual, o punto de partida ajeno a ella), se mantiene la pregunta `destino`, sugerencias documentales dirigidas y entrada libre.
6. «Otro concepto…» abre un campo para indicar **un concepto diferente**, sin pedir que el estudiante vuelva a escribir la pregunta inicial.
7. El detalle léxico V1 y la lectura técnica V2 se muestran en un panel desplegable, mientras el diálogo expone primero una devolución comprensible de lo que entendió.

## Persistencia

`src/services/user-queries.contract.js` acepta y valida la lista opcional `consulta.conceptosRelacionados`. El repositorio de persistencia V2 ya serializa el objeto `consulta`, por lo que este incremento no requiere una migración adicional de MariaDB. `destino` sigue disponible para la relación de un solo destinatario; si hay varios conceptos, no se compactan artificialmente en un único ID.

## Regresiones esperadas

Las pruebas antiguas del orientador que exigían volver a preguntar `destino` para un concepto **ya mencionado** se actualizaron deliberadamente: se verifica su conservación automática. Las pruebas de aristas dirigidas se mantienen para el caso en que el estudiante solicita relacionar un único concepto y aún falta un segundo. No hay cálculo de trayectos ni inferencia editorial.

## Comprobación

Desde la raíz:

```bash
cd public
npm run test:orientador
cd ..
node --test src/test/user-queries.test.mjs src/test/user-queries-v2.test.mjs
cd e2e
npx playwright test tests/orientador-sentidos-v2.spec.mjs
```

También revisar manualmente `/#/lab/orientador` con «¿Cuáles son las diferencias entre disposición, virtud y felicidad?»; después de elegir `hexis` y `distinguir`, el siguiente paso debe ser `nivel` (no `destino`).
