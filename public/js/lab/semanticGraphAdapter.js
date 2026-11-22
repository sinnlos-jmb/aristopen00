// Adaptador independiente del renderer. No altera la proyección ni infiere aristas.
export function proyeccionAElementos(proyeccion, { tipos = null } = {}) {
  const permitido = tipos ? new Set(tipos) : null;
  const nodes = (proyeccion?.nodes || []).filter(n => !permitido || permitido.has(n.tipo));
  const ids = new Set(nodes.map(n => n.uid));
  const edges = (proyeccion?.edges || []).filter(e => ids.has(e.desde) && ids.has(e.hacia));
  return [
    ...nodes.map(n => ({ group: 'nodes', data: {
      id: n.uid, label: n.etiqueta, tipo: n.tipo, fuente: n.fuente,
      griego: n.griego, referencia: n.referencia, voz: n.voz,
    } })),
    ...edges.map(e => ({ group: 'edges', data: {
      id: e.uid, source: e.desde, target: e.hacia, tipo: e.tipo,
      relacion: e.relacion, fuente: e.fuente, referencia: e.referencia,
      voz: e.voz, sentidoReferido: e.sentidoReferido, rol: e.rol, aristaFuente: e.idFuente || '',
    } })),
  ];
}

// Vista resumida: cada nodo representa UNA CLASE, nunca un concepto filosófico.
// Los vínculos agrupan ocurrencias documentales y NO expresan una nueva relación.
export function resumenClasesAElementos(proyeccion) {
  const counts = new Map();
  for (const n of proyeccion?.nodes || []) counts.set(n.tipo, (counts.get(n.tipo) || 0) + 1);
  const index = new Map((proyeccion?.nodes || []).map(n => [n.uid, n.tipo]));
  const enlaces = new Map();
  for (const e of proyeccion?.edges || []) {
    const desde = index.get(e.desde), hacia = index.get(e.hacia);
    if (!desde || !hacia) continue;
    const key = JSON.stringify([desde, hacia, e.tipo]);
    enlaces.set(key, (enlaces.get(key) || 0) + 1);
  }
  return [
    ...[...counts].map(([tipo, cantidad]) => ({ group: 'nodes', data: {
      id: `clase:${tipo}`, tipo, cantidad, label: `${tipo.replaceAll('_', ' ')} (${cantidad})`, resumen: true,
    } })),
    ...[...enlaces].map(([key, cantidad], i) => {
      const [desde, hacia, relacion] = JSON.parse(key);
      return { group: 'edges', data: {
        id: `grupo:${i}`, source: `clase:${desde}`, target: `clase:${hacia}`,
        tipo: relacion, cantidad, resumen: true,
      } };
    }),
  ];
}

export function estadisticasElementos(elementos) {
  return { nodos: elementos.filter(e => e.group === 'nodes').length,
    aristas: elementos.filter(e => e.group === 'edges').length };
}
