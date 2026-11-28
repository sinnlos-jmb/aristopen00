// N1-U.19.3.6a — intérprete local, estricto y de solo lectura. No ejecuta Cypher externo.
const identifier = "([A-Za-z0-9_.:-]{1,100})";
const patterns = [
 ['manifestaciones',`MATCH \\(n:Nucleo\\)-\\[:CONTIENE\\]->\\(m:Manifestacion\\)-\\[:MANIFIESTA\\]->\\(c:Concepto\\) WHERE c.uid = '${identifier}' RETURN n, m, c`],
 ['relaciones',`MATCH \\(n:Nucleo\\)-\\[:CONTIENE\\]->\\(a:Manifestacion\\)-\\[:RELACION_CONTEXTUAL\\]->\\(b:Manifestacion\\) WHERE n.id = '${identifier}' RETURN n, a, b`],
 ['evidencias',`MATCH \\(n:Nucleo\\)-\\[:FUNDAMENTADO_EN\\]->\\(e:Evidencia\\) WHERE n.id = '${identifier}' RETURN n, e`],
 ['continuaciones',`MATCH \\(n:Nucleo\\)-\\[:CONTINUA_CON\\]->\\(s:Nucleo\\) WHERE n.id = '${identifier}' RETURN n, s`]
];
export const SEMANTIC_EXAMPLES = Object.freeze([
 ['Manifestaciones de lógos',"MATCH (n:Nucleo)-[:CONTIENE]->(m:Manifestacion)-[:MANIFIESTA]->(c:Concepto) WHERE c.uid = 'estatico:logos' RETURN n, m, c LIMIT 20"],
 ['Actividad y virtud',"MATCH (n:Nucleo)-[:CONTIENE]->(a:Manifestacion)-[:RELACION_CONTEXTUAL]->(b:Manifestacion) WHERE n.id = 'n04' RETURN n, a, b LIMIT 20"],
 ['Evidencia del bien humano',"MATCH (n:Nucleo)-[:FUNDAMENTADO_EN]->(e:Evidencia) WHERE n.id = 'n04' RETURN n, e LIMIT 20"],
 ['Aperturas desde la felicidad',"MATCH (n:Nucleo)-[:CONTINUA_CON]->(s:Nucleo) WHERE n.id = 'n04' RETURN n, s LIMIT 20"]
]);
export function compileSemanticQuery(source) {
 const input=String(source??'').trim();
 if(input.length>1500)throw Error('Consulta demasiado larga.');
 // Los espacios fuera de literales pueden variar; los IDs se mantienen exactos.
 const normalized=input.replace(/\s+/g,' ').replace(/^MATCH (.*?) WHERE /,(_,graph)=>'MATCH '+graph.replace(/\s/g,'')+' WHERE ');
 for(const [kind,pattern] of patterns){
  const m=new RegExp(`^${pattern}(?: LIMIT ([0-9]{1,2}))?;?$`).exec(normalized);
  if(!m)continue;
  const limit=m[2]===undefined?20:Number(m[2]);
  if(limit<1||limit>50)throw Error('LIMIT debe estar entre 1 y 50.');
  if(kind==='manifestaciones'&&!/^(estatico|funcional):[A-Za-z0-9_.-]+$/.test(m[1]))throw Error('Usá el UID exacto con espacio de nombres.');
  return {kind,id:m[1],limit};
 }
 throw Error('Patrón no admitido. Elegí uno de los cuatro ejemplos; solo lectura, dirección explícita y LIMIT 1–50.');
}
const pick=(n)=>({id:n.id,unidad:n.unidad,formulacion:n.formulacion,funcion_argumentativa:n.funcion_argumentativa,voz:n.voz,estado:n.estado,limite:n.limite});
const manifestation=(n,m)=>({...m,uid:`${n.id}/${m.id}`,evidencia_uid:`${n.id}/e${m.evidencia}`});
const evidence=(n,e,i)=>({...e,uid:`${n.id}/e${i}`,identidad_parrafo:`${e.obra}:${e.libro}:p${e.parrafo_local}`});
// El resultado conserva la procedencia y la dirección; ninguna coaparición crea aristas.
export function runSemanticQuery(source,pilot,check,{contractIssues=[],graphIssues=[],revision='',textHash=null,transitionNotes={}}={}){
 const ast=compileSemanticQuery(source);
 if(!check||!Array.isArray(check.issues)||check.issues.length||contractIssues.length||graphIssues.length)throw Error('Hay incidencias de integridad: no se generan resultados reutilizables.');
 if(ast.kind==='manifestaciones'&&!check.concepts.has(ast.id))throw Error('Concepto ausente del catálogo activo.');
 if(ast.kind!=='manifestaciones'&&!check.nodes.has(ast.id))throw Error('Núcleo inexistente.');
 let rows=[];
 const add=(n,other={},indices=n.evidencias.map((_,i)=>i))=>rows.push({n:pick(n),...other,evidencias:[...new Set(indices)].map(i=>evidence(n,n.evidencias[i],i))});
 if(ast.kind==='manifestaciones'){
  const c=check.concepts.get(ast.id);
  for(const n of pilot.nucleos)for(const m of n.manifestaciones)if(m.concepto===ast.id)add(n,{m:manifestation(n,m),c:{uid:c.uid,id:c.id,label:c.label}},[m.evidencia]);
 }else{
  const n=check.nodes.get(ast.id);
  if(ast.kind==='relaciones')for(const r of n.relaciones){const a=n.manifestaciones.find(m=>m.id===r.de),b=n.manifestaciones.find(m=>m.id===r.a);add(n,{a:manifestation(n,a),b:manifestation(n,b),relacion:{...r,familia:pilot.familias_relacion[r.rel]}},[a.evidencia,b.evidencia]);}
  if(ast.kind==='evidencias')n.evidencias.forEach((e,i)=>add(n,{e:evidence(n,e,i)},[i]));
  if(ast.kind==='continuaciones')for(const t of pilot.transiciones.filter(t=>t.de===n.id)){const s=check.nodes.get(t.a);add(n,{s:pick(s),transicion:{...t},nota_editorial:transitionNotes[`${t.de}/${t.a}`]??null,evidencias_destino:s.evidencias.map((e,i)=>evidence(s,e,i))});}
 }
 return {schema:'agora.semantic-query.v1',query:String(source).trim(),ast,revision_activa:revision,revision_catalogo:pilot.revision_catalogo,archivo:pilot.texto.archivo,sha256_esperado:pilot.texto.sha256,sha256_activo:textHash,estado_catalogo:pilot.estado,incremento_catalogo:pilot.incremento,propuestas_sentidos:(pilot.propuestas_sentidos||[]).filter(p=>rows.slice(0,ast.limit).some(r=>[r.m,r.a,r.b].some(m=>m?.concepto===p.concepto&&m?.sentido_candidato===p.id))),total:rows.length,truncado:rows.length>ast.limit,rows:rows.slice(0,ast.limit)};
}
export function buildSemanticContext(result,check,question=''){
 if(!result.rows.length)throw Error('Sin resultados: no hay contexto semántico que exportar.');
 if(!result.sha256_activo||result.sha256_activo!==result.sha256_esperado)throw Error('Para exportar contexto, el SHA-256 del texto debe coincidir con el catálogo.');
 if(!result.revision_activa)throw Error('Falta la revisión activa del catálogo.');
 if(result.rows.length>12)throw Error('Reducí LIMIT a 12 o menos para preparar contexto.');
 const q=String(question).trim();if(q.length>1000)throw Error('Pregunta demasiado larga.');
 const paragraphs=new Map();
 for(const row of result.rows)for(const e of [...row.evidencias,...(row.evidencias_destino||[])]){
  const p=check.paragraphs.get(e.parrafo_local);if(!p?.gr||!p?.es)throw Error('Falta un párrafo bilingüe.');
  paragraphs.set(e.identidad_parrafo,{id:e.identidad_parrafo,gr:p.gr,es:p.es});
 }
 const packet={schema:'agora.semantic-context.v1',pregunta:q,consulta:result.query,revision_activa:result.revision_activa,revision_catalogo:result.revision_catalogo,archivo:result.archivo,sha256_activo:result.sha256_activo,estado_catalogo:result.estado_catalogo,incremento_catalogo:result.incremento_catalogo,total:result.total,truncado:result.truncado,alcance:'EN I; anclas comprobadas en párrafo, no offsets de subunidad; propuesta editorial, no validación filosófica.',reglas:['Distinguir texto bilingüe, reconstrucción editorial, sentidos candidatos y continuaciones.','No identificar coaparición con causalidad, ni invertir o encadenar relaciones como inferencias.','No atribuir presupuestos al interlocutor ni afirmar que una transición es una deducción.','Responder la pregunta, indicar límites y ofrecer una continuación opcional.','No inventar citas; usar las referencias y anclas incluidas. La traducción pertenece al párrafo completo. Un ancla recuperada no fundamenta necesariamente toda la formulación del núcleo.'],propuestas_sentidos:result.propuestas_sentidos||[],resultados:result.rows,parrafos:[...paragraphs.values()]};
 if(JSON.stringify(packet).length>60000)throw Error('Contexto demasiado amplio; reducí LIMIT.');
 return packet;
}
