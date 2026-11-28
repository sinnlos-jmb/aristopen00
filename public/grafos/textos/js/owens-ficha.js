'use strict';
/* Capas de los grafos de Owens: agrega a la ficha del motor la lectura propia, el contacto con Berti
   y los enlaces al texto. No modifica grafos.js; observa #info y completa la ficha ya armada. */
(function(){
  var panel = document.getElementById('info');
  if (!panel || typeof OWENS === 'undefined') return;
  function h(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function rangos(p){ return String(p || '').split(',').map(function(s){ return s.trim(); }).filter(Boolean); }
  function rot(r){ return '\u00a7' + r.replace('-', '\u2013'); }
  function enlace(id, r){
    return 'lectura.html?t=' + encodeURIComponent(OWENS.corpus) + '&from=' + encodeURIComponent(OWENS.file) +
           '&n=' + encodeURIComponent(id) + '#p' + r;
  }
  function completar(){
    if (!selected || panel.querySelector('.owx')) return;
    var it = selected.type === 'node' ? byId(selected.id) : edgeById(selected.id);
    if (!it) return;
    var p = panel.querySelector('p');
    if (p && it.desc) {
      var k = document.createElement('div');
      k.className = 'owx owKicker';
      k.textContent = it.type === 'originary' ? 'Planteo' : 'Lo que dice Owens';
      p.parentNode.insertBefore(k, p);
    }
    var html = '';
    if (it.propia) html += '<div class="owCapa owPropia"><div class="owT">Lectura propia</div><p>' + h(it.propia) + '</p></div>';
    if (it.berti) html += '<div class="owCapa owBerti"><div class="owT">Contacto con Berti</div><p>' + h(it.berti) + '</p></div>';
    var rs = rangos(it.par);
    if (rs.length) {
      html += '<div class="owLeer">' + rs.map(function(r){
        return '<a class="owBtn" href="' + h(enlace(it.id, r)) + '">Leer en el texto ' + h(rot(r)) + ' \u2192</a>';
      }).join('') + '</div>';
    }
    if (!html) { var m = document.createElement('span'); m.className = 'owx'; m.hidden = true; panel.appendChild(m); return; }
    var box = document.createElement('div');
    box.className = 'owx owBox';
    box.innerHTML = html;
    var ref = panel.querySelector('.ref');
    if (ref && ref.nextSibling) ref.parentNode.insertBefore(box, ref.nextSibling);
    else if (ref) ref.parentNode.appendChild(box);
    else panel.appendChild(box);
  }
  new MutationObserver(completar).observe(panel, {childList: true});
  completar();
})();
