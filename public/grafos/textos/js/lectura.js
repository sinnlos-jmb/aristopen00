'use strict';
// Pagina de lectura generica. Uso: lectura.html?t=<id-del-corpus>#p12  o  #p12-14 (rango resaltado).
// Parametros opcionales: from=<archivo-del-grafo>&n=<nodo> para el boton Volver.
(function(){
  const q = new URLSearchParams(location.search);
  const T = q.get('t') || '';
  const FROM = q.get('from') || '';
  const NODE = q.get('n') || '';
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const fmt = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>');

  if (FROM && /^[\w.-]+\.html$/.test(FROM)) {
    const a = document.createElement('a');
    a.className = 'go';
    a.href = './' + FROM + (NODE ? '#' + encodeURIComponent(NODE) : '');
    a.textContent = '\u2190 Volver al grafo';
    $('#back').append(a);
  }

  function range(){
    const m = /^#p(\d+)(?:-(\d+))?$/.exec(location.hash || '');
    if (!m) return null;
    const a = +m[1], b = m[2] ? +m[2] : a;
    return [Math.min(a,b), Math.max(a,b)];
  }
  function mark(scroll){
    document.querySelectorAll('.par.on').forEach(p => p.classList.remove('on'));
    const r = range();
    if (!r) return;
    for (let i = r[0]; i <= r[1]; i++) document.getElementById('p' + i)?.classList.add('on');
    if (scroll) document.getElementById('p' + r[0])?.scrollIntoView({block:'start'});
  }

  if (!/^[\w-]+$/.test(T)) { $('#titulo').textContent = 'Falta indicar el texto'; return; }
  fetch('./js/data/' + T + '.json').then(r => { if (!r.ok) throw Error(r.status); return r.json(); }).then(d => {
    document.title = d.corto + ' \u00b7 ' + d.autor;
    $('#autor').textContent = d.autor;
    $('#titulo').textContent = d.titulo;
    let html = '<p class="nota" lang="es">Texto en su versi\u00f3n original, numerado por p\u00e1rrafo (\u00a7) para las remisiones desde el grafo. ' + d.total + ' p\u00e1rrafos en ' + d.secciones.length + ' secciones.</p>';
    const sel = $('#secciones');
    sel.innerHTML = '<option value="">Secciones</option>';
    for (const s of d.secciones) {
      const first = s.pars[0].n, last = s.pars[s.pars.length-1].n;
      html += '<h2 id="s' + esc(s.n) + '">' + esc(s.n) + ' <span lang="es">\u00b7 \u00a7' + first + '\u2013' + last + '</span></h2>';
      for (const p of s.pars) html += '<p class="par" id="p' + p.n + '"><a class="num" href="#p' + p.n + '" aria-label="P\u00e1rrafo ' + p.n + '">\u00a7' + p.n + '</a>' + fmt(p.text) + '</p>';
      const o = document.createElement('option');
      o.value = 'p' + first; o.textContent = s.n + ' \u00b7 \u00a7' + first + '\u2013' + last;
      sel.append(o);
    }
    $('#texto').innerHTML = html;
    sel.onchange = () => { if (sel.value) { location.hash = sel.value; sel.value = ''; } };
    mark(true);
  }).catch(e => { $('#titulo').textContent = 'No se pudo cargar el texto'; $('#texto').innerHTML = '<p class="error" lang="es">Error al cargar ./data/' + esc(T) + '.json (' + esc(e.message) + '). La p\u00e1gina necesita el servidor web.</p>'; });
  window.addEventListener('hashchange', () => mark(true));
})();
