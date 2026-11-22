// Sólo se carga al abrir el visor. El fichero local se prepara desde el paquete npm.
let pending = null;
export function cargarCytoscape() {
  if (typeof window === 'undefined') return Promise.reject(new Error('El visor requiere navegador.'));
  if (typeof window.cytoscape === 'function') return Promise.resolve(window.cytoscape);
  if (pending) return pending;
  pending = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/vendor/cytoscape.min.js';
    script.async = true;
    script.onload = () => typeof window.cytoscape === 'function'
      ? resolve(window.cytoscape)
      : reject(new Error('La biblioteca Cytoscape cargó sin exponer su API.'));
    script.onerror = () => reject(new Error('Falta /public/vendor/cytoscape.min.js. Consultá docs/LAB_VISOR_GENERICO_V1.md.'));
    document.head.append(script);
  }).catch(e => { pending = null; throw e; });
  return pending;
}
