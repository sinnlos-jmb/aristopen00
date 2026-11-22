// Notificaciones breves exclusivamente para acciones confirmadas del visor.
// El estado persistente sigue siendo responsabilidad de graphLayoutPersistence.js.
const DURACION_MS = 2800;

export function crearNotificadorGrafo(contenedor, { programar = setTimeout, cancelar = clearTimeout } = {}) {
  let timer = null;
  let destruido = false;
  function limpiar() {
    if (timer != null) { cancelar(timer); timer = null; }
    contenedor?.replaceChildren();
  }
  return {
    mostrar(mensaje, { error = false } = {}) {
      if (destruido || !contenedor || !String(mensaje || '').trim()) return;
      limpiar(); // una notificación, nunca una pila
      const aviso = contenedor.ownerDocument.createElement('div');
      aviso.className = `lab-graph-toast${error ? ' lab-graph-toast--error' : ''}`;
      aviso.setAttribute('role', error ? 'alert' : 'status');
      aviso.textContent = String(mensaje);
      contenedor.append(aviso);
      timer = programar(() => { timer = null; if (!destruido) contenedor.replaceChildren(); }, DURACION_MS);
    },
    destruir() { destruido = true; limpiar(); },
  };
}
