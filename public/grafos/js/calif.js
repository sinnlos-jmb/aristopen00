// calif.js · las calificaciones se pliegan y despliegan juntas · v1
'use strict';
(function () {
  if (typeof NODES === 'undefined' || typeof EDGES === 'undefined') return
  const ids = new Set(NODES.filter(n => n.type === 'calif').map(n => n.id))
  if (!ids.size) return
  const touch = new Set(EDGES.filter(e => ids.has(e.source) || ids.has(e.target)).map(e => e.id))
  const mark = () => document.querySelectorAll('g.edge').forEach(g => { if (touch.has(g.dataset.edgeId)) g.classList.add('toCalif') })
  const ge = document.getElementById('gedges')
  if (ge) new MutationObserver(mark).observe(ge, { childList: true })
  mark()
  const keys = document.getElementById('keys')
  if (!keys) return
  const b = document.createElement('button')
  b.type = 'button'
  b.id = 'califBtn'
  b.title = 'Las calificaciones van al costado del nodo que califican'
  const set = on => {
    document.body.classList.toggle('hideCalif', !on)
    b.setAttribute('aria-pressed', String(on))
    b.textContent = on ? 'Ocultar calificaciones' : 'Mostrar calificaciones'
  }
  b.onclick = () => set(document.body.classList.contains('hideCalif'))
  keys.parentNode.insertBefore(b, keys)
  set(true)
})()
