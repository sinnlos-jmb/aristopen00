# Checkpoint 8A — FAQ agrupadas y visibilidad individual

## Contrato

La proyección editorial y MariaDB **no se alteran**. En el visor focal:

- Un grupo con dos o más FAQ muestra **foco → agrupador** (una sola conexión). Al desplegarlo, las preguntas aparecen con **agrupador → FAQ**, sin volver a multiplicar las conexiones gráficas con el foco.
- Esos ramales tienen `fuente: presentacion`, `agrupacionVisual: 1`, y `aristaOriginalId` para localizar la relación `foco_faq` del corpus. No interpretarlos como relaciones filosóficas ni como su dirección original. Las FAQ compartidas pueden salir de más de un agrupador.
- Los títulos propios de la arista documental (`aristaOriginalId`) se conservan al redirigir visualmente los ramales.
- Seleccionar un nodo ofrece **Ocultar nodo**, salvo si es un foco, y **Conservar nodo y camino** (incluyendo sus aristas documentadas hasta algún foco). El camino conserva la dirección original de cada arista y usa el recorrido no dirigido solo para descubrir vecinos.
- Una rama conservada permanece visible tras contraer otras expansiones. No se genera una conexión ficticia entre un nodo lejano y un foco. Si una ocultación impide encontrar un camino, el nodo conservado puede quedar temporalmente inaccesible; los datos de preferencia no se destruyen.
- Un agrupador se puede ocultar y restaurar; sus FAQ exclusivas se ocultan con él. Las preguntas compartidas con otras rutas visibles siguen accesibles.
- La sección **Recuperar un nodo individual** y **Restaurar nodos ocultos** permite revertir las ocultaciones. **Quitar nodos conservados** libera todas las ramas fijadas.
- El botón **Persistir ordenamiento** guarda en el mismo almacenamiento que los checkpoints 5–7 `nodosOcultos` y `nodosConservados`, además de posiciones, títulos, etiquetas, filtros y agrupaciones expandidas. No se guarda automáticamente cada movimiento.

## Pasos manuales de verificación

1. Entrar a `/#/lab/visor-grafos`; desplegar un agrupador con varias FAQ y comprobar que cuelgan **del agrupador**, sin crear nuevas líneas desde el foco.
2. Seleccionar una FAQ compartida por dos focos; inspeccionar los ramales visuales y confirmar la propiedad `aristaOriginalId`.
3. Ocultar un vecino, restaurarlo desde el listado; intentar ocultar un foco (debe estar bloqueado).
4. Expandir dos o tres niveles, conservar un nodo terminal y contraer las expansiones: solo su camino registrado debe seguir representado.
5. Buscar un concepto lejano y usar **Conservar rama** sin convertirlo en foco.
6. Guardar, cambiar focos y volver a los iniciales; confirmar que ocultaciones, ramas conservadas, posiciones y títulos reaparecen.
7. Probar con los filtros de tipos desactivados y con el checkbox de párrafos; no atribuir a los recorridos una inferencia filosófica.

## Pruebas

```sh
node public/scripts/check-visor-visibilidad-8a.mjs
node public/scripts/check-visor-faq-grupos.mjs
node public/scripts/check-visor-disposiciones.mjs
node public/scripts/check-visor-expansion.mjs
node public/scripts/check-visor-filtros.mjs
node public/scripts/check-visor-titulos-aristas.mjs
node public/scripts/check-identidad-visor.mjs
```

La integración en un navegador real requiere validación en el corpus del repositorio; las pruebas automáticas ejercitan reglas puras de datos.
