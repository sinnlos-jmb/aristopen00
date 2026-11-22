// N1-U.3 · Aristas editoriales hipotéticas para el Proemio. Sin escrituras a MariaDB.
const fail = msg => { throw new Error(`Relaciones del Proemio: ${msg}`); };
const TIPOS = new Set(['especifica', 'multiplica', 'ordena', 'acota', 'plantea', 'motiva', 'formula', 'identifica', 'determina', 'amplia']);
const clean = v => typeof v === 'string' && v.trim().length > 0;

export function construirRelacionesProemio(modelo, propuesta) {
  if (propuesta?.schema !== 'agora.lab.n1u3.relaciones_argumentativas.v1') fail('schema no reconocido');
  if (!modelo?.revision || propuesta.fuente?.revision !== modelo.revision) fail('revisión distinta de la API');
  if (propuesta.fuente?.unidad_id !== 'proemio') fail('unidad de procedencia distinta de proemio');
  if (propuesta.estado !== 'propuesta_no_validada' || !Array.isArray(propuesta.relaciones)) fail('no se recibió una lista explícita de propuestas');
  const unidad = modelo.unidades.get('proemio');
  if (!unidad) fail('no existe proemio en la revisión actual');
  const ids = new Set(unidad.subunidades.map(s => s.id));
  const relaciones = [], idsUsados = new Set(), pares = new Set();
  for (const r of propuesta.relaciones) {
    if (!clean(r?.id) || idsUsados.has(r.id)) fail(`id vacío o repetido: ${String(r?.id)}`);
    if (!ids.has(r.de) || !ids.has(r.a) || r.de === r.a) fail(`extremos inválidos para ${r.id}`);
    if (!clean(r.nombre) || !clean(r.fundamento) || !TIPOS.has(r.tipo)) fail(`semántica incompleta para ${r.id}`);
    if (r.estado !== 'propuesta_no_validada') fail(`no se puede elevar ${r.id} a relación validada desde el Lab`);
    const par = `${r.de}->${r.a}`;
    if (pares.has(par)) fail(`arista duplicada: ${par}`);
    pares.add(par); idsUsados.add(r.id);
    relaciones.push(Object.freeze({ ...r }));
  }
  if (!relaciones.length) fail('no hay relaciones propuestas');
  return Object.freeze({ unidadId: 'proemio', revision: modelo.revision,
    nota: String(propuesta.nota || ''),
    relaciones: Object.freeze(relaciones),
    porId: new Map(relaciones.map(r => [r.id, r])),
    subIds: Object.freeze(unidad.subunidades.map(s => s.id)),
  });
}

export function elementosRelacionesProemio(modelo, grupo, seleccion = {}) {
  if (grupo.revision !== modelo.revision) fail('se intentó dibujar otra revisión');
  // Grilla serpenteante para mantener próximos los nodos de la secuencia del texto.
  const nodes = grupo.subIds.map((id, i) => {
    const col = Math.floor(i / 4), fila = col % 2 ? 3 - i % 4 : i % 4;
    const s = modelo.subs.get(id);
    return { group: 'nodes', data: { id: `sub:${id}`, key: id, tipo: 'subunidad',
      label: `${s.titulo}\n${Array.isArray(s.bekker) ? s.bekker.join('–') : id}`,
      seleccionado: seleccion.subId === id ? 1 : 0 },
      position: { x: 170 + col * 395, y: 105 + fila * 158 } };
  });
  const edges = grupo.relaciones.map(r => ({ group: 'edges', data: {
    id: `rel:${r.id}`, key: r.id, source: `sub:${r.de}`, target: `sub:${r.a}`,
    tipo: 'argumentativa_propuesta', label: r.nombre,
    seleccionado: seleccion.relacionId === r.id ? 1 : 0,
  } }));
  return [...nodes, ...edges];
}
