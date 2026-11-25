// Ágora · N1-U.15 · Motor de recuperación experimental, puro y sin API externa.
// TF-IDF/coseno es similitud LÉXICA vectorizada, no embeddings ni juicio filosófico.
import { buildLibrary, passageText, parseBekker } from '../../js/reader/text.js';

const STOP = new Set(('el la los las un una unos unas de del a al y e o u en con por para que qué como cómo donde dónde cual cuáles cual es son era fue ser se su sus lo les le este esta estos estas eso esos desde sobre entre sino ante acerca mas más hay puede pueden aristoteles aristóteles texto pasaje libro etica ética').split(' '));
const arr = v => Array.isArray(v) ? v : [];
export function normalizeText(v) {
  return String(v ?? '').normalize('NFD').replace(/\p{M}/gu, '')
    .toLocaleLowerCase('es').replace(/ς/g, 'σ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
export function terms(v) { return normalizeText(v).split(/\s+/).filter(t => t.length > 1 && !STOP.has(t)); }
function idList(v) {
  return [...new Set(arr(v).map(x => typeof x === 'string' ? x : x?.id).filter(x => typeof x === 'string' && x.trim()))];
}
function textOf(v) { return Array.isArray(v) ? v.join(' ') : String(v ?? ''); }

export function buildEvidenceDocuments(lectura, book) {
  if (!arr(lectura?.tags?.unidades).length || !arr(book?.chapters).length) throw Error('Faltan unidades o párrafos del Libro I.');
  const subs = lectura.tags.unidades.flatMap(u => arr(u.subunidades).map(s => ({ ...s, unidadId: u.id, unidadTitulo: u.titulo })));
  const lib = buildLibrary([book], {
    SUB: Object.fromEntries(subs.map(s => [s.id, s])),
    repo: { libroTagueado: () => book.id },
  });
  const docs = [];
  const indexedByParagraph = new Map();
  for (const s of subs) {
    const passage = lib.passages[s.id];
    const es = passage ? passageText(book, passage, 'es') : '';
    const gr = passage ? passageText(book, passage, 'gr') : '';
    const staticTags = idList(s.conceptos_clave);
    const functionalTags = idList(s.movimientos);
    const doc = {
      id: `sub:${s.id}`, kind: 'subunidad', sourceId:s.id,
      title:s.titulo || s.id, unit:s.unidadTitulo, reference:s.id,
      intro:s.intro || '', es, gr, staticTags, functionalTags,
      tagOrigin: 'Etiquetas de la subunidad (MariaDB)', relatedSubunits:[s.id],
      chapter:passage?.chapter ?? null, paragraph:null,
    };
    docs.push(doc);
    // Asociación por anclas textuales verificadas; nunca etiqueta directa del párrafo.
    for (const p of passage?.es || []) {
      if (!indexedByParagraph.has(p.paragraph)) indexedByParagraph.set(p.paragraph, []);
      indexedByParagraph.get(p.paragraph).push(doc);
    }
  }
  for (const ch of book.chapters) for (const p of ch.paragraphs) {
    const associations = indexedByParagraph.get(p.number) || [];
    docs.push({
      id:`paragraph:${p.number}`, kind:'parrafo', sourceId:String(p.number),
      title:`Párrafo ${p.number} · I.${ch.number}`, unit:`Libro I · capítulo ${ch.number}`,
      reference:`I.${ch.number} · párr. ${p.number}`, intro:'', es:p.es, gr:p.gr,
      staticTags:[...new Set(associations.flatMap(a=>a.staticTags))],
      functionalTags:[...new Set(associations.flatMap(a=>a.functionalTags))],
      tagOrigin: associations.length ? 'Etiquetas proyectadas desde subunidades por anclas; NO tagueo del párrafo' : 'Párrafo sin etiquetas de subunidad asociadas',
      relatedSubunits:[...new Set(associations.map(s=>s.sourceId))],
      chapter:ch.number, paragraph:p.number,
    });
  }
  return { documents:docs, issues:lib.issues, revision:lectura.revision || '', bookId:book.id };
}

export function buildSheetLinks(fichaFiles, bridgeFile = null) {
  const ids = new Map();
  const slugs = {
    proemio:'proemio', 'faq.etica.intro':'etica', 'faq.agathon.pros_hen':'bien',
    'faq.lab.felicidad':'felicidad','faq.lab.ergon':'ergon','faq.lab.alma':'alma','faq.lab.virtudes':'virtudes',
  };
  for (const payload of arr(fichaFiles)) for (const f of arr(payload?.fichas)) {
    if (!slugs[f.id]) continue;
    const supports = [...new Set([...arr(f.apoyos).map(x=>x.sub_id), ...arr(f.pasos).map(x=>x.sub_id)].filter(Boolean))];
    ids.set(f.id, { id:f.id, title:f.titulo, url:`/#/fichas/${slugs[f.id]}`, supports });
  }
  for (const bridge of arr(bridgeFile?.puentes)) {
    const ficha = ids.get(bridge.ficha_id);
    if (ficha) ficha.supports = [...new Set([...ficha.supports, ...arr(bridge.apoyos).map(x=>x.sub_id)].filter(Boolean))];
  }
  const bySub = new Map();
  for (const f of ids.values()) for (const sub of f.supports) {
    if (!bySub.has(sub)) bySub.set(sub, []);
    bySub.get(sub).push({ id:f.id, title:f.title, url:f.url, reason:'Pasaje seleccionado editorialmente en la ficha' });
  }
  return bySub;
}

function vectorFrequency(tokens) {
  const tf = new Map();
  for (const token of tokens) tf.set(token, (tf.get(token) || 0) + 1);
  // Frecuencia sublineal: evita que un párrafo largo monopolice el ranking.
  for (const [token,count] of tf) tf.set(token,1+Math.log(count));
  return tf;
}
export function makeIndex(documents) {
  const uniqueIds = new Set();
  const DF = new Map();
  const source = documents.map(d=>{
    if (!d.id || uniqueIds.has(d.id)) throw Error(`Documento duplicado: ${d.id}`);
    uniqueIds.add(d.id);
    const title = [d.title,d.title,d.title].join(' ');
    const searchable = [title, d.intro, d.es, d.gr].join(' ');
    const tf = vectorFrequency(terms(searchable));
    for (const t of tf.keys()) DF.set(t,(DF.get(t)||0)+1);
    return {...d, normalizedText:normalizeText(searchable), tf};
  });
  const N = source.length;
  const idf = t=>1+Math.log((N+1)/((DF.get(t)||0)+1));
  return {
    size:N,
    documents:source.map(d=>{
      const vector = new Map([...d.tf].map(([t,w])=>[t,w*idf(t)]));
      const norm = Math.hypot(...vector.values()) || 1;
      return { ...d, vector, norm };
    }),
    idf,
  };
}

export function searchIndex(index, { query='', staticTags=[], functionalTags=[], filterMode='boost', type='ambos', limit=12, supportSubIds=null }={}) {
  const selectedStatic = new Set(staticTags), selectedFunctional = new Set(functionalTags);
  const scope = Array.isArray(supportSubIds) ? new Set(supportSubIds) : null;
  const q = [...new Set(terms(query))];
  if (!q.length && !selectedStatic.size && !selectedFunctional.size) return [];
  const qtf=vectorFrequency(q);
  const qvec=new Map([...qtf].map(([t,w])=>[t,w*index.idf(t)]));
  const qnorm=Math.hypot(...qvec.values()) || 1;
  return index.documents.flatMap(d=>{
    if (type!=='ambos' && d.kind !== type) return [];
    if (scope && !d.relatedSubunits.some(id=>scope.has(id))) return [];
    const hitsS=d.staticTags.filter(id=>selectedStatic.has(id));
    const hitsF=d.functionalTags.filter(id=>selectedFunctional.has(id));
    if (filterMode==='restrict' && ((selectedStatic.size && !hitsS.length)||(selectedFunctional.size && !hitsF.length))) return [];
    const matched=q.filter(t=>d.vector.has(t));
    const numerator=[...qvec].reduce((sum,[t,w])=>sum+w*(d.vector.get(t)||0),0);
    const cosine=q.length ? numerator/(qnorm*d.norm) : 0;
    const exact = q.length>1 && d.normalizedText.includes(normalizeText(query)) ? .08 : 0;
    const tagBonus=Math.min(.24, hitsS.length*.07+hitsF.length*.07);
    const score=cosine+exact+tagBonus;
    if(score <= 0.00001) return [];
    return [{ ...d, score:Number(score.toFixed(5)), cosine:Number(cosine.toFixed(5)), exact,
      tagBonus, matchedTerms:matched, matchedStatic:hitsS, matchedFunctional:hitsF }];
  }).sort((a,b)=>b.score-a.score || a.id.localeCompare(b.id)).slice(0,Math.max(1,Math.min(50,Number(limit)||12)));
}

export function categoryChoices(documents, type) {
  const key=type==='static'?'staticTags':'functionalTags';
  const counts=new Map();
  // Sólo las subunidades aportan etiquetas directas; evita inflar la frecuencia con herencias de párrafos.
  for (const d of documents) if (d.kind==='subunidad') for (const id of d[key]) counts.set(id,(counts.get(id)||0)+1);
  return [...counts].map(([id,count])=>({id,count})).sort((a,b)=>b.count-a.count || a.id.localeCompare(b.id));
}
