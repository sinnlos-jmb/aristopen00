// Renderer único: no sabe de filosofía ni genera relaciones.
// Recibe elementos Cytoscape y propaga eventos al experimento que lo usa.
import { cargarCytoscape } from './cytoscapeLoader.js';

export async function crearVisorGrafo(contenedor, elementos, {
  agrupado = false, alSeleccionar = () => {}, alOcultar = () => {}, alDobleClick = null,
  posicionesIniciales = {}, layoutContextual = false,
} = {}) {
  const cytoscape = await cargarCytoscape();
  const cy = cytoscape({
    container: contenedor,
    elements: elementos,
    // Checkpoint 2: la sensibilidad del checkpoint previo (0.23) era muy baja.
    wheelSensitivity: 1.75,
    minZoom: 0.08,
    maxZoom: 12,
    layout: layoutContextual
      ? { name: 'preset' }
      : agrupado
      ? { name: 'circle', animate: false, padding: 35 }
      : { name: 'cose', animate: false, randomize: true, numIter: 380,
          nodeRepulsion: () => 160000, idealEdgeLength: () => 110, padding: 42 },
    style: [
      { selector: 'node', style: {
        'background-color': '#dce7ec', 'border-color': '#7193a6', 'border-width': 1.3,
        'label': 'data(label)', 'color': '#24394a', 'font-size': agrupado ? 12 : 10,
        'text-wrap': 'ellipsis', 'text-max-width': agrupado ? 140 : 100,
        'text-valign': 'center', 'text-halign': 'center',
        'width': agrupado ? 138 : 82, 'height': agrupado ? 54 : 38,
        'shape': 'round-rectangle', 'text-outline-width': 0,
      } },
      { selector: 'node[tipo = "nodo_funcional"]', style: { 'background-color': '#d5eadf' } },
      { selector: 'node[tipo = "grupo_faq"]', style: {
        'background-color': '#f6dba0', 'border-color': '#a87524', 'border-width': 2.6,
        'width': 96, 'height': 45, 'font-weight': 'bold',
      } },
      { selector: 'node[tipo = "faq"]', style: { 'background-color': '#f4e6bf' } },
      { selector: 'node[tipo = "subunidad"]', style: { 'background-color': '#e4dcf0' } },
      { selector: 'node[grupoUsuario = 1]', style: { 'background-color': '#d6d0ed', 'border-color': '#7561a3', 'border-width': 3, 'width': 138, 'font-weight': 'bold' } },
      { selector: 'node[orientativo = 1]', style: { 'background-color': '#f1f3f5', 'border-color': '#aab8c2', 'border-style': 'dashed', 'color': '#687986', 'opacity': 0.8 } },
      { selector: 'node[anclaContextual = 1]', style: { 'background-color': '#c3dbea', 'border-color': '#28618c', 'border-width': 3.5, 'width': 138, 'font-weight': 'bold' } },
      { selector: 'node[grupoTexto = 1]', style: { 'background-color': '#c8e2e0', 'border-color': '#39837b', 'border-width': 2.6, 'width': 136 } },
      { selector: 'node[unidadTexto = 1]', style: { 'background-color': '#dce9da', 'border-color': '#68885a', 'width': 122 } },
      { selector: 'node[subunidadTexto = 1]', style: { 'background-color': '#eee6d1', 'border-color': '#9a8756', 'width': 128 } },
      { selector: 'node[anclaRelacion = 1]', style: { 'background-color': '#dce4f1', 'border-color': '#657f9b', 'width': 112 } },
      { selector: 'node[compartido = 1]', style: { 'border-color': '#6e67b1', 'border-width': 2.5 } },
      { selector: 'node[expandido = 1]', style: { 'border-color': '#287550', 'border-width': 3.5 } },
      { selector: 'node[conservado = 1]', style: { 'border-style': 'double', 'border-width': 4, 'border-color': '#856c39' } },
      { selector: 'node[foco = 1]', style: { 'background-color': '#c3dbea', 'border-color': '#28618c',
        'border-width': 3.5, 'font-weight': 'bold' } },
      { selector: 'edge', style: {
        'curve-style': 'bezier', 'width': 1.2, 'line-color': '#99a8b5',
        'target-arrow-shape': 'triangle', 'target-arrow-color': '#99a8b5',
        'arrow-scale': 0.7, 'opacity': 0.75,
      } },
      { selector: 'edge[agrupacionVisual = 1]', style: {
        'line-style': 'dashed', 'line-color': '#c6a266', 'target-arrow-shape': 'none', 'opacity': 0.6,
      } },
      { selector: 'edge[navegacionTextual = 1]', style: {
        'line-style': 'dotted', 'line-color': '#6b9187', 'target-arrow-shape': 'triangle', 'target-arrow-color': '#6b9187', 'opacity': 0.8, 'width': 1.5,
      } },
      { selector: 'edge[ordenTextual = 1]', style: { 'line-style': 'dashed', 'line-color': '#8d7a9e', 'target-arrow-shape': 'triangle', 'target-arrow-color': '#8d7a9e', 'width': 1.3 } },
      { selector: 'edge[pertenenciaTextual = 1]', style: { 'line-style': 'solid', 'line-color': '#628a70', 'target-arrow-shape': 'triangle', 'target-arrow-color': '#628a70', 'width': 1.6 } },
      { selector: 'edge[orientativo = 1]', style: { 'line-style': 'solid', 'line-color': '#b4bdc5', 'target-arrow-shape': 'triangle', 'target-arrow-color': '#b4bdc5', 'opacity': 0.65 } },
      { selector: 'edge[conexionFocos = 1]', style: {
        'width': 3.2, 'line-color': '#376f93', 'target-arrow-color': '#376f93', 'opacity': 1,
        'z-index': 20,
      } },
      { selector: 'edge[nombreAristaVisible != ""]', style: {
        'label': 'data(nombreAristaVisible)', 'font-size': 11, 'color': '#253b4c',
        'text-background-color': '#ffffff', 'text-background-opacity': 0.88,
        'text-background-padding': 3, 'text-rotation': 'none',
        'text-wrap': 'wrap', 'text-max-width': 145,
      } },
      { selector: ':selected', style: {
        'border-color': '#b36d20', 'border-width': 3, 'line-color': '#b36d20',
        'target-arrow-color': '#b36d20', 'opacity': 1,
      } },
    ],
  });
  const posicionValida = p => p && Number.isFinite(p.x) && Number.isFinite(p.y);
  function aplicarPosiciones(posiciones = {}) {
    cy.batch(() => {
      for (const [id, position] of Object.entries(posiciones)) {
        const n = cy.getElementById(id);
        if (n.isNode() && posicionValida(position)) n.position(position);
      }
    });
  }
  aplicarPosiciones(posicionesIniciales);
  let previous = { id: null, at: 0 };
  cy.on('tap', 'node', evt => {
    const item = evt.target;
    if (item.data('orientativo')) { previous = { id: null, at: 0 }; item.unselect(); return; }
    const now = Date.now();
    if (item.id() === previous.id && now - previous.at < 350) {
      previous = { id: null, at: 0 };
      if (alDobleClick) alDobleClick({ clase: 'nodo', ...item.data() });
      else { item.hide(); alOcultar(item.data()); }
      return;
    }
    previous = { id: item.id(), at: now };
    alSeleccionar({ clase: 'nodo', ...item.data() });
  });
  cy.on('tap', 'edge', evt => { previous = { id: null, at: 0 }; if (evt.target.data('orientativo')) { evt.target.unselect(); return; } alSeleccionar({ clase: 'arista', ...evt.target.data() }); });
  cy.on('tap', evt => { if (evt.target === cy) { previous = { id: null, at: 0 }; alSeleccionar(null); } });

  return {
    cy,
    enfocar(id) {
      const node = cy.getElementById(id);
      if (node.empty()) return false;
      node.show(); node.select();
      cy.animate({ center: { eles: node }, zoom: Math.max(cy.zoom(), 0.95) }, { duration: 220 });
      alSeleccionar({ clase: 'nodo', ...node.data() });
      return true;
    },
    // Actualización incremental: los nodos existentes conservan sus posiciones.
    // Se agregan solo los nuevos vecinos alrededor de un nodo ya representado.
    actualizarElementos(nuevos, { posiciones = {} } = {}) {
      const nodes = nuevos.filter(x => x.group === 'nodes');
      const edges = nuevos.filter(x => x.group === 'edges');
      const wantedN = new Set(nodes.map(x => x.data.id));
      const wantedE = new Set(edges.map(x => x.data.id));
      const knownN = new Set(cy.nodes().map(x => x.id()));
      const slots = new Map();
      const nuevosN = nodes.filter(n => !knownN.has(n.data.id));
      cy.batch(() => {
        cy.edges().forEach(e => { if (!wantedE.has(e.id())) e.remove(); });
        cy.nodes().forEach(n => { if (!wantedN.has(n.id())) n.remove(); });
        // Mantener datos de estilos (foco, compartido, expandido) actualizados.
        for (const n of nodes) {
          const actual = cy.getElementById(n.data.id);
          if (actual.nonempty()) actual.data(n.data);
        }
        for (const n of nuevosN) {
          // Los recorridos conservados pueden añadir varios nodos de una vez.
          // La búsqueda incluye los agregados antes en este mismo lote.
          const vecino = edges.find(e => (e.data.source === n.data.id && cy.getElementById(e.data.target).nonempty()) ||
            (e.data.target === n.data.id && cy.getElementById(e.data.source).nonempty()));
          const anchorId = vecino ? (vecino.data.source === n.data.id ? vecino.data.target : vecino.data.source) : null;
          const anchor = anchorId ? cy.getElementById(anchorId) : null;
          const pos = anchor?.nonempty() ? anchor.position() : { x: 0, y: 0 };
          const count = slots.get(anchorId || '_') || 0;
          slots.set(anchorId || '_', count + 1);
          const angle = -Math.PI / 2 + (count % 10) * Math.PI * 2 / 10;
          const radius = 135 + Math.floor(count / 10) * 100;
          cy.add({ ...n, position: posicionValida(posiciones[n.data.id]) ? posiciones[n.data.id]
            : { x: pos.x + radius * Math.cos(angle), y: pos.y + radius * Math.sin(angle) } });
        }
        for (const e of edges) {
          const actual = cy.getElementById(e.data.id);
          if (actual.empty()) cy.add(e);
          else actual.data(e.data);
        }
      });
      return { nodos: cy.nodes().length, aristas: cy.edges().length };
    },
    posiciones() {
      return Object.fromEntries(cy.nodes().map(n => [n.id(), { x: n.position('x'), y: n.position('y') }]));
    },
    aplicarPosiciones,
    ocultarSeleccion() { const s = cy.$(':selected'); s.hide(); alOcultar(null); },
    restaurar() { cy.elements().show(); },
    ajustar() { cy.fit(cy.elements().visible(), 35); },
    zoom(factor) {
      const level = Math.max(cy.minZoom(), Math.min(cy.maxZoom(), cy.zoom() * factor));
      cy.zoom({ level, renderedPosition: { x: contenedor.clientWidth / 2, y: contenedor.clientHeight / 2 } });
    },
    destruir() { cy.destroy(); },
  };
}
