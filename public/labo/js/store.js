export const SOURCE_LABELS = {
  texto: 'Texto',
  nota: 'Nota',
  tag_previo: 'Tag previo',
  unidad: 'Unidad',
  subunidad: 'Subunidad',
  faq: 'FAQ',
  pilar: 'Pilar',
  profundizar: 'Para profundizar',
  clave: 'Clave',
  definicion: 'Definición',
  decision: 'Decisión',
  estatico: 'Estático',
  funcional: 'Funcional',
  grafo: 'Grafo',
};

export const VOICE_LABELS = {
  textual: 'Textual',
  traduccion: 'Traducción',
  comentarista: 'Comentarista',
  endoxa: 'Éndoxon',
  nuestra: 'Lectura nuestra',
  unstructured: 'Voz no estructurada',
};

export const DEFAULT_CONFIG = {
  scope: 'en1',
  limit: 20,
  includeUnstructured: false,
};

const CONFIG_KEY = 'eni.labo.config.v1';

async function jsonResponse(response) {
  let data;
  try { data = await response.json(); } catch { throw new Error(`Respuesta inválida del servidor (${response.status}).`); }
  if (!response.ok) throw new Error(data.error || `El servicio no está disponible (${response.status}).`);
  return data;
}
export async function loadInitial() {
  const response = await fetch('/api/labo/inicio', {cache:'no-store'});
  const data = await jsonResponse(response);
  const corpus = data.corpus;
  if (!data.revision || !corpus?.catalog?.criteria || !data.constructor || data.constructor.corpusHash !== corpus.contentHash)
    throw new Error('Los datos del Labo están incompletos o no corresponden a la misma versión.');
  corpus.byId = new Map();
  corpus.criterionById = new Map(corpus.catalog.criteria.map(x => [x.id, x]));
  corpus.criterionChildren = new Map();
  for (const x of corpus.catalog.criteria) if (x.parentId) {
    if (!corpus.criterionChildren.has(x.parentId)) corpus.criterionChildren.set(x.parentId, []);
    corpus.criterionChildren.get(x.parentId).push(x.id);
  }
  return { corpus, queryModel:data.constructor, revision:data.revision, avisos:data.avisos || [] };
}
export async function remoteSearch(revision, params) {
  const response=await fetch('/api/labo/buscar',{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify({revision,...params})});
  return jsonResponse(response);
}

export async function loadCourseModel(app,tipo) {
  const data=await jsonResponse(await fetch(`/api/labo/modelos/${encodeURIComponent(tipo)}?revision=${encodeURIComponent(app.revision)}`,{cache:'no-store'}));
  if(data.revision!==app.revision||data.modelo?.corpusHash!==app.corpus.contentHash||!Array.isArray(data.compatibles))throw Error('El guion y el corpus no corresponden a la misma revisión.');
  return {...data.modelo,compatiblePreviousHashes:data.compatibles};
}
export async function loadReadings(app,model) {
  const nums=new Set();
  function walk(x){if(!x||typeof x!=='object')return;for(const [k,v] of Object.entries(x)){if((k==='paragraphs'||k==='dependencyParagraphs')&&Array.isArray(v)){for(const n of v)if(Number.isInteger(n)&&n>0)nums.add(n);}else if(typeof v==='object')walk(v);}}
  walk(model);
  const ids=[...nums].flatMap(n=>[`texto:p${n}:es`,`texto:p${n}:gr`]).filter(id=>!app.corpus.byId.has(id));
  for(let i=0;i<ids.length;i+=100){
    const data=await jsonResponse(await fetch('/api/labo/fragmentos',{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify({revision:app.revision,ids:ids.slice(i,i+100)})}));
    if(data.revision!==app.revision||!Array.isArray(data.faltantes)||data.faltantes.length)throw Error('Faltan pasajes del recorrido en esta revisión; no se cargó el recorrido.');
    for(const f of data.fragmentos)app.corpus.byId.set(f.id,f);
  }
}
export async function remoteCommand(revision,tipo,payload){
 return jsonResponse(await fetch('/api/labo/comando',{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify({revision,tipo,...payload})}));
}
// Un registro que no se puede validar se conserva intacto y no permite acciones que lo sobrescriban.
export function protectRecord(root,raw){
 root.innerHTML='<section class="bot-notice" role="alert"><h2>Registro anterior protegido</h2><p>Este registro no pudo validarse con el guion actual. Se conservó intacto; no se iniciará otro encima. Descargá una copia para revisarlo antes de continuar.</p><button type="button" id="export-record-protected">Descargar registro original</button></section>';
 root.querySelector('#export-record-protected').onclick=()=>{const url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='agora-registro-original.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
}
export function loadConfig() {
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}') };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config) {
  const safe = {
    scope: config.scope === 'all' ? 'all' : 'en1',
    limit: Math.max(5, Math.min(50, Number(config.limit) || DEFAULT_CONFIG.limit)),
    includeUnstructured: Boolean(config.includeUnstructured),
  };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(safe));
  return safe;
}

