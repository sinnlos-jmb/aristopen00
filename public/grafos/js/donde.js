// donde.js · botón «¿Dónde estoy?», versión básica · v2
'use strict';
(function () {
  if (typeof GRAPH_INDEX === 'undefined') return
  // nodos del grafo cero que señala cada grafo (el primero queda seleccionado) · provisorio
  const DONDE = {
    grafo0: ['eudaimonia', 'estado_etico'],
    grafoEsferas: ['arete_total', 'eudaimonia', 'estado_etico'],
    grafoAlma: ['psuche', 'arete_total'],
    grafo1: ['arete_total', 'eudaimonia'],
    grafo2: ['eudaimonia'],
    grafo3: ['realizacion'],
    grafo4: ['realizacion', 'llamada', 'arete_total'],
    grafo4a: ['arete_total'],
    grafo4b: ['realizacion'],
    grafo4d: ['realizacion']
  }
  const file = decodeURIComponent(location.pathname.split('/').pop() || '')
  const css = document.createElement('style')
  css.textContent = '.node.dHere .main{stroke:#2783DE!important;stroke-width:4!important;stroke-dasharray:6 4}'
  document.head.appendChild(css)
  if (file === 'grafo_cero.html') {
    const m = decodeURIComponent(location.hash || '').match(/from=([^:,]+)/)
    const src = m && GRAPH_INDEX.find(g => g.file === m[1])
    const ids = new Set(src && DONDE[src.id] || [])
    if (!ids.size) return
    const mark = () => document.querySelectorAll('#gnodes g.node').forEach(n => n.classList.toggle('dHere', ids.has(n.dataset.id)))
    const gn = document.getElementById('gnodes'); if (gn) new MutationObserver(mark).observe(gn, { childList: true })
    mark()
    return
  }
  const here = GRAPH_INDEX.find(g => g.file === file)
  if (!here || !DONDE[here.id]) return
  const keys = document.getElementById('keys'); if (!keys) return
  const b = document.createElement('button'); b.type = 'button'; b.id = 'dondeBtn'; b.textContent = '\u00bfD\u00f3nde estoy?'
  b.title = 'Ver en el grafo cero el tramo del camino que trabaja este grafo'
  b.onclick = () => { location.href = './grafo_cero.html?' + new URLSearchParams({revision:window.AGORA_GRAPH_REVISION}) + '#' + DONDE[here.id][0] + ',from=' + file + ':' }
  keys.parentNode.insertBefore(b, keys)
})()
