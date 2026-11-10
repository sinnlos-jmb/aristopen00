import { createRepository } from './content/repository.js';

export async function loadTags(url) {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
}

export async function loadOptional(url) {
  try {
    const r = await fetch(url, { cache: 'no-cache' });
    return r.ok ? await r.json() : null;
  } catch (_) {
    return null;
  }
}

export function buildStore(tags, { funcional = null, estatico = null, manual = null, argumentos = null, trayectos = null } = {}) {
  const S = { tags };
  if (argumentos) S.argumentos = argumentos;

  S.U = Object.fromEntries((tags.unidades || []).map(u => [u.id, u]));
  S.SUB = {};
  S.MOM = {};
  for (const u of tags.unidades || []) {
    for (const s of u.subunidades || []) S.SUB[s.id] = { ...s, unidad: u.id };
    for (const m of (u.articulacion && u.articulacion.momentos) || []) {
      for (const sid of m.subs || []) S.MOM[sid] = { u, m };
    }
  }

  S.FAQ = Object.fromEntries((tags.faqs || []).map(f => [f.id, f]));
  S.PIL = Object.fromEntries((tags.pilares || []).map(p => [p.id, p]));
  S.CLV = Object.fromEntries((tags.claves || []).map(c => [c.id, c]));
  S.DEF = Object.fromEntries((tags.definiciones || []).map(d => [d.id, d]));

  // FIX: S.DEFC — índice por concepto (lo consume definitions.js)
  S.DEFC = {};
  for (const d of Object.values(S.DEF)) {
    (S.DEFC[d.concepto] = S.DEFC[d.concepto] || []).push(d);
  }

  S.DEFSUB = {};
  for (const d of Object.values(S.DEF)) {
    for (const e of d.etapas || []) {
      const subs = [e.a && e.a.startsWith('sub:') ? e.a.slice(4) : null]
        .concat(e.subs || [])
        .filter(Boolean);
      for (const sid of subs) (S.DEFSUB[sid] = S.DEFSUB[sid] || []).push({ d, e });
    }
  }

  S.SUPER = Object.fromEntries(
    ((tags.mapa && tags.mapa.super_unidades) || []).map(x => [x.id, x])
  );
  S.SUPER_LIBRO = Object.values(S.SUPER).find(x =>
    x.libros.some(l => l.n === (tags.mapa && tags.mapa.libro_tagueado))
  ) || null;

  S.TP = Object.fromEntries((tags.parrafos || []).map(p => [p.parrafo, p]));

  if (funcional) {
    S.FN = {};
    S.FE = funcional.aristas || [];
    const walk = (n, depth) => {
      S.FN[n.id] = { ...n, depth };
      (n.hijos || []).forEach(h => walk(h, depth + 1));
    };
    (funcional.categorias || []).forEach(c => walk(c, 1));
    S.ftree = funcional;

    S.REM = {};
    Object.values(S.FN).forEach(f => {
      (f.remite_a || []).forEach(r => {
        (S.REM[r] = S.REM[r] || []).push(f.id);
      });
    });
    Object.values(S.FN).forEach(f => {
      (f.remite_a || []).forEach(r => {
        const base = r.split('#')[0];
        if (base !== r && !(S.REM[base] || []).includes(f.id)) {
          (S.REM[base] = S.REM[base] || []).push(f.id);
        }
      });
    });
  }

  if (estatico) {
    S.N = {};
    const walk = (n, path, depth) => {
      S.N[n.id] = { ...n, path: [...path], depth };
      (n.hijos || []).forEach(h => walk(h, [...path, n.id], depth + 1));
    };
    (estatico.raices || []).forEach(r => walk(r, [], 1));
    S.tree = estatico;
  }

  if (S.FN && S.N && S.SUB && S.U) {
    S.NODE_UNIT = {};
    const subConcepts = {};
    for (const [subId, sub] of Object.entries(S.SUB)) {
      subConcepts[subId] = new Set(sub.conceptos_clave || []);
    }
    for (const [nodeId, node] of Object.entries(S.FN)) {
      const concepts = new Set();
      if (S.N[nodeId]) concepts.add(nodeId);
      (node.remite_a || []).forEach(r => concepts.add(r.split('#')[0]));
      if (!concepts.size) continue;
      let bestSub = null, bestScore = 0;
      for (const [subId, subSet] of Object.entries(subConcepts)) {
        let overlap = 0;
        for (const c of concepts) if (subSet.has(c)) overlap++;
        if (overlap > bestScore) { bestScore = overlap; bestSub = subId; }
      }
      if (bestSub) {
        const sub = S.SUB[bestSub];
        const unit = S.U[sub.unidad];
        S.NODE_UNIT[nodeId] = {
          sub: bestSub,
          subTitulo: sub.titulo,
          unidad: sub.unidad,
          unidadTitulo: unit?.titulo || sub.unidad,
          unidadResumen: unit?.resumen || '',
          weight: bestScore,
        };
      }
    }
  }

  if (manual) S.manual = manual;

  // Acceso al contenido para el resto de la app (bot, Lab, vistas). Ver content/repository.js
  S.trayectosRaw = trayectos;
  S.repo = createRepository(S, { tags, trayectos });

  return S;
}