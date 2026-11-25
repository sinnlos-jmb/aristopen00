// Ágora N1-U.16: AST compartido y gramáticas de consulta de SOLO LECTURA.
// Ni Cypher ni SQL se ejecutan en MariaDB: se interpretan contra índices locales.
const unique = items => [...new Set((items || []).filter(Boolean))];
export const TYPES = Object.freeze(['ambos', 'subunidad', 'parrafo']);
export const MODES = Object.freeze(['natural', 'visual', 'cypher', 'hibrido']);
const MAX_LEN = 1500;
const ALLOWED_ID = /^[a-zA-Z0-9_.:-]{1,100}$/;
const BAD = message => { throw new Error(`Consulta inválida: ${message}`); };
const quoted = (value, what) => {
  if (!value || value.length > 400) BAD(`${what}: texto vacío o demasiado largo.`);
  return value;
};
function normalize(input) {
  const type = input.type || 'ambos';
  if (!TYPES.includes(type)) BAD(`tipo desconocido: ${type}`);
  const filterMode = input.filterMode || 'boost';
  if (!['boost','restrict'].includes(filterMode)) BAD('modo de etiquetas desconocido.');
  const limit = Number(input.limit || 12);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) BAD('límite fuera de 1–50.');
  const tags = key => unique(input[key]).map(id=>{
    if(!ALLOWED_ID.test(id)) BAD(`etiqueta ${key} inválida.`);
    return id;
  });
  const sheetId = input.sheetId || '';
  if(sheetId && !ALLOWED_ID.test(sheetId)) BAD('identificador de ficha inválido.');
  return {
    schema:'agora.query.v1', query:String(input.query || '').trim(), type,
    sheetId, staticTags:tags('staticTags'), functionalTags:tags('functionalTags'),
    filterMode, limit,
    graph: input.graph || null,
  };
}
export function compileNatural(query, base = {}) {
  return normalize({ ...base, query:quoted(String(query).trim(),'pregunta'), graph:null });
}
export function compileVisual(options) { return normalize({...options,graph:null}); }

// Patrón deliberadamente pequeño. Ejemplo:
// MATCH (f:Ficha)-[:RELACIONADA_CON]->(g:Ficha)
// WHERE f.id = 'faq.lab.felicidad' RETURN f, g
// SEARCH 'actividad racional'
export function compileCypher(src) {
  const text=String(src).trim();
  if(text.length>MAX_LEN) BAD('consulta técnica demasiado larga.');
  // Recorridos de longitud acotada, con dirección explícita y destino opcional.
  const walk=/^MATCH\s+([a-z]\w*)\s*=\s*\(([a-z]\w*):Ficha\)\s*(<-|-)\s*\[(?::RELACIONADA_CON)?\*([1-3])\.\.([1-3])\]\s*(->|-)\s*\(([a-z]\w*):Ficha\)\s+WHERE\s+([a-z]\w*)\.id\s*=\s*'([a-zA-Z0-9_.:-]+)'(?:\s+AND\s+([a-z]\w*)\.id\s*=\s*'([a-zA-Z0-9_.:-]+)')?\s+RETURN\s+([a-z]\w*)(?:\s+SEARCH\s+'([^']{1,400})')?\s*;?$/is.exec(text);
  if(walk){
    const [,pathVar,from,arrowLeft,lo,hi,arrowRight,to,whereVar,source,targetVar,target,ret,search]=walk;
    if(new Set([pathVar,from,to]).size!==3||whereVar!==from||ret!==pathVar||(targetVar&&targetVar!==to)||Number(lo)>Number(hi)||(arrowLeft==='<-'&&arrowRight==='->')) BAD('patrón de recorrido incoherente.');
    if(!ALLOWED_ID.test(source)||(target&&!ALLOWED_ID.test(target))) BAD('identificador inválido.');
    return normalize({query:search||'',graph:{relation:'RELACIONADA_CON',fromId:source,toId:target||null,minDepth:Number(lo),maxDepth:Number(hi),direction:arrowLeft==='<-'?'entrante':arrowRight==='->'?'saliente':'ambas',returned:['camino']},limit:12});
  }
  const match=/^MATCH\s*\(([a-z]\w*):Ficha\)\s*-\s*\[:RELACIONADA_CON\]\s*->\s*\(([a-z]\w*):Ficha\)\s+WHERE\s+([a-z]\w*)\.id\s*=\s*'([a-zA-Z0-9_.:-]+)'\s+RETURN\s+([a-z]\w*)(?:\s*,\s*([a-z]\w*))?(?:\s+SEARCH\s+'([^']{1,400})')?\s*;?$/is.exec(text);
  if (!match) BAD('se admite MATCH (f:Ficha)-[:RELACIONADA_CON]->(g:Ficha) WHERE f.id = \'…\' RETURN f, g [SEARCH \'…\'].');
  const [,from,to,whereVar,source,ret1,ret2,search] = match;
  if(from===to || whereVar!==from || ![from,to].includes(ret1) || (ret2 && (![from,to].includes(ret2) || ret1===ret2))) BAD('variables de patrón incoherentes.');
  if(!ALLOWED_ID.test(source)) BAD('identificador de ficha inválido.');
  return normalize({ query:search||'', graph:{relation:'RELACIONADA_CON',fromId:source,returned:unique([ret1,ret2]).map(v=>v===from?'origen':'destino')}, limit:12 });
}

// Híbrido declarativo (NO SQL arbitrario):
// SELECT PASAJES WHERE TEXTO CONTAINS 'felicidad actividad'
// AND TIPO = 'parrafo' AND FICHA = 'faq.lab.felicidad' AND ESTATICA = 'arete' LIMIT 12
export function compileHybrid(src) {
  let text=String(src).trim();
  if (text.length>MAX_LEN) BAD('consulta técnica demasiado larga.');
  const head=/^SELECT\s+PASAJES\s+WHERE\s+TEXTO\s+CONTAINS\s+'([^']{1,400})'/i.exec(text);
  if(!head) BAD("se exige SELECT PASAJES WHERE TEXTO CONTAINS '…'.");
  const input={query:quoted(head[1],'TEXTO'),staticTags:[],functionalTags:[],filterMode:'restrict'};
  text=text.slice(head[0].length).trim();
  const used=new Set();
  while(/^AND\b/i.test(text)) {
    text=text.replace(/^AND\s+/i,'');
    const clause=/^(TIPO|FICHA|ESTATICA|FUNCIONAL|MODO)\s*=\s*'([^']{1,120})'/i.exec(text);
    if(!clause) BAD('condición AND desconocida o mal escrita.');
    const field=clause[1].toUpperCase();const val=clause[2];
    if(field!=='ESTATICA'&&field!=='FUNCIONAL'&&used.has(field)) BAD(`campo ${field} repetido.`);
    used.add(field);
    if(field==='TIPO')input.type=val;
    if(field==='FICHA')input.sheetId=val;
    if(field==='ESTATICA')input.staticTags.push(val);
    if(field==='FUNCIONAL')input.functionalTags.push(val);
    if(field==='MODO')input.filterMode=val;
    text=text.slice(clause[0].length).trim();
  }
  const lim=/^LIMIT\s+(\d{1,2})\s*;?$/i.exec(text);
  if(lim){input.limit=Number(lim[1]);text='';}
  if(text && text!==';') BAD('sólo se permiten AND campo = \'valor\' y LIMIT n.');
  return normalize(input);
}

export function parseQuery(mode,source,visual={}) {
  if (mode==='natural')return compileNatural(source,visual);
  if (mode==='visual')return compileVisual(visual);
  if (mode==='cypher')return compileCypher(source);
  if (mode==='hibrido')return compileHybrid(source);
  BAD('modalidad desconocida.');
}

// Las aristas registradas en el JSON son la única base de los recorridos.
// La similitud textual NUNCA crea una arista.
export function graphMatches(ast, graphLinks, sheetMap) {
  if(!ast.graph) return { edges:[], sheetIds: ast.sheetId ? [ast.sheetId] : [] };
  if(ast.graph.maxDepth){
    const {fromId,toId,minDepth,maxDepth,direction}=ast.graph;
    if(!sheetMap.has(fromId)||(toId&&!sheetMap.has(toId))) BAD('ficha inexistente o de otra revisión.');
    const registered=(graphLinks||[]).filter(e=>sheetMap.has(e.desde)&&sheetMap.has(e.hacia));
    const paths=[], queue=[{ids:[fromId],edges:[]}];
    // Caminos simples: no repetimos nodos, y acotamos el trabajo aun si crece el catálogo.
    for(let i=0;i<queue.length;i++){
      const p=queue[i],last=p.ids.at(-1);
      if(p.edges.length>=minDepth&&(!toId||last===toId))paths.push(p);
      if(p.edges.length>=maxDepth||(toId&&last===toId))continue;
      for(const e of registered){
        const next=e.desde===last&&direction!=='entrante'?e.hacia:e.hacia===last&&direction!=='saliente'?e.desde:null;
        if(!next||p.ids.includes(next))continue;
        if(queue.length>=1000)BAD('recorrido demasiado amplio; reducí profundidad o dirección.');
        queue.push({ids:[...p.ids,next],edges:[...p.edges,e]});
      }
    }
    const ids=[...new Set(paths.flatMap(p=>p.ids))];
    return {edges:[...new Set(paths.flatMap(p=>p.edges))],sheetIds:ids,paths};
  }
  const edges=(graphLinks||[]).filter(e=>e.desde===ast.graph.fromId && sheetMap.has(e.desde) && sheetMap.has(e.hacia));
  const ids = new Set();
  for (const e of edges) {
    if(ast.graph.returned.includes('origen')) ids.add(e.desde);
    if(ast.graph.returned.includes('destino')) ids.add(e.hacia);
  }
  return {edges,sheetIds:[...ids]};
}

// Con una ficha (o patrón) restringimos exclusivamente a apoyos seleccionados por editor.
export function scopeFor(ast, sheets, matches) {
  const ids=ast.graph ? matches.sheetIds : ast.sheetId ? [ast.sheetId] : null;
  if(ids===null)return null;
  const scope=new Set();
  for (const id of ids) {
    if(!sheets.has(id)) BAD(`ficha inexistente o de otra revisión: ${id}`);
    for(const sub of sheets.get(id).supports)scope.add(sub);
  }
  return [...scope];
}

export function queryWarning(query) {
  const normalized=String(query).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
  return /\blogos\b/.test(normalized)
    ? 'Atención: «lógos» presenta sentidos distintos (razón, argumento, discurso, etc.). Este índice todavía no desambigua sentidos: revisá cada cita en contexto.'
    : '';
}
