// N1-U.14 · Índice vectorial léxico local (TF-IDF disperso + coseno).
// NO utiliza embeddings; los resultados son candidatos de orientación, NO aristas.
const STOP = new Set(('de del la las el los lo un una unos unas que por para con sin en a al y o e se su sus es son ser fue como cuando que cual quien dónde qué cómo cuál cuál es este esta estos estas desde sobre entre según aun más menos cada toda todo todos todas ya también pero no si sino acerca tiene tener hay hacia mediante asi aquí allí otro otra otros otras dentro donde porque pues algo alguno alguna').split(' '));
export function tokens(text) {
  return String(text || '').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/ς/g,'σ')
    .match(/[\p{L}\p{N}]+/gu)?.filter(t => t.length >= 3 && !STOP.has(t)) || [];
}
function collectText(card) {
  const pieces = [card.titulo, ...(card.introduccion || []), ...(card.lectura_grafo || [])];
  for(const step of (card.pasos || [])) pieces.push(step.titulo, step.comentario);
  pieces.push(...(card.transiciones || []));
  return pieces.filter(x => typeof x === 'string').join(' ').slice(0,40000);
}
const tf = text => {
  const counts = new Map();
  for (const token of tokens(text)) counts.set(token,(counts.get(token)||0)+1);
  return counts;
};
export function construirIndiceFichas(cards) {
  if (!Array.isArray(cards) || !cards.length || cards.length > 200) throw new Error('Catálogo de fichas inválido');
  const seen = new Set();
  const docs = cards.map(card => {
    if (!card?.id || !card?.titulo || seen.has(card.id)) throw new Error('Identidad editorial ausente o repetida');
    seen.add(card.id);
    // Los nombres reciben mayor peso, pero NO se inventan términos que no figuren.
    const counts = tf(collectText(card));
    for (const token of tokens(card.titulo)) counts.set(token,(counts.get(token)||0)+5);
    return { id:card.id,title:card.titulo,summary:card.introduccion?.[0]||'', counts };
  });
  const df = new Map();
  for (const doc of docs) for (const token of doc.counts.keys()) df.set(token,(df.get(token)||0)+1);
  const idf = token => 1+Math.log((docs.length+1)/((df.get(token)||0)+1));
  for(const doc of docs) {
    doc.weights = new Map([...doc.counts].map(([t,n])=>[t,(1+Math.log(n))*idf(t)]));
    doc.norm = Math.hypot(...doc.weights.values());
  }
  return { docs, idf };
}
export function buscarFichasVectorial(indice, query, limit=5) {
  const q = tf(String(query || '').slice(0,200));
  if (!q.size) return [];
  const qweights = new Map([...q].map(([t,n])=>[t,(1+Math.log(n))*indice.idf(t)]));
  const qnorm = Math.hypot(...qweights.values());
  return indice.docs.map(doc=>{
    let dot=0;
    const matches=[];
    for(const [term,w] of qweights) if(doc.weights.has(term)) { dot += w*doc.weights.get(term); matches.push(term); }
    return { id:doc.id,title:doc.title,summary:doc.summary,
      score: doc.norm && qnorm ? dot/(doc.norm*qnorm) : 0, terms:matches };
  }).filter(r=>r.score>0).sort((a,b)=>b.score-a.score || a.id.localeCompare(b.id))
    .slice(0,Math.max(1,Math.min(7,limit)));
}
export async function cargarIndiceFichas(fetcher=fetch) {
  const paths=['/lab/n1u5-fichas-explicativas.json','/lab/n1u7-fichas-red-piloto.json'];
  const sources = await Promise.all(paths.map(async path=>{
    const response=await fetcher(path,{cache:'no-cache'});
    if(!response.ok) throw new Error(`No se pudo cargar ${path} (${response.status})`);
    return response.json();
  }));
  if(sources[0]?.schema!=='agora.lab.n1u5.fichas.v1' || sources[1]?.schema!=='agora.lab.n1u7.fichas-red.v1')
    throw new Error('Revisión editorial de fichas incompatible');
  if(sources[0].fuente?.revision !== sources[1].fuente?.revision)
    throw new Error('Los conjuntos de fichas tienen revisiones diferentes');
  return construirIndiceFichas([...sources[0].fichas,...sources[1].fichas]);
}
