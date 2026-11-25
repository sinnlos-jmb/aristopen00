// N1-U.19.3: proyección documental, no ontología ni análisis morfológico.
const entry=(id,role)=>({id,role});
export const CONCEPTS=[
 {id:'eudaimonia',title:'Eudaimonía · felicidad',gr:'εὐδαιμονία εὐδαιμονίας εὐδαιμονίᾳ εὐδαιμονίαν εὐδαίμων εὐδαίμονος εὐδαίμονες εὐδαίμονας εὐδαιμονεῖν εὐδαιμονεῖ',es:'felicidad feliz felices',sheets:['faq.lab.felicidad','faq.lab.ergon'],maps:['felicidad','forma'],definition:[entry('1098a16-18','Formulación del bien humano'),entry('1098a18-20','Continuación: vida entera y ejemplo de la golondrina'),entry('1100a3-5','Virtud completa en una vida entera')],allusions:[entry('1097a34-b6','Fin elegido por sí mismo'),entry('1097b20-21','Completitud y autosuficiencia'),entry('1102a5-7','Retoma la actividad del alma según virtud')]},
 {id:'ergon',title:'Érgon · función propia',gr:'ἔργον ἔργου ἔργῳ ἔργα ἔργων ἔργοις',es:'función funciones obra obras',sheets:['faq.lab.ergon'],maps:['ergon','funcion'],definition:[entry('1098a7-8','Caracterización de la función humana según razón')],allusions:[entry('1097b22-25','Pregunta por la función'),entry('1097b25-28','Analogía con los artífices'),entry('1098a16-18','Conclusión del argumento')]},
 {id:'arete',title:'Areté · virtud',gr:'ἀρετή ἀρετῆς ἀρετῇ ἀρετήν ἀρεταί ἀρετῶν ἀρεταῖς ἀρετάς',es:'virtud virtudes excelencia excelencias',sheets:['faq.lab.virtudes','faq.lab.felicidad'],maps:['alma','felicidad'],definition:[entry('1102a13-18','Caracterización de la virtud humana: la del alma'),entry('1103a3-7','Clasificación de las virtudes; no definición general')],allusions:[entry('1098a16-18','Actividad según virtud'),entry('1100a3-5','Virtud completa y vida entera')]},
 {id:'logos',title:'Lógos · razón, argumento, definición',gr:'λόγος λόγου λόγῳ λόγον λόγοι λόγων λόγοις λόγους',es:'razón razones argumento argumentos definición definiciones discurso discursos',sheets:['faq.lab.ergon','faq.lab.alma'],maps:['ergon','alma'],definition:[],allusions:[entry('1098a7-8','Razón: actividad humana'),entry('1103a1-3','Razón: dos modos de poseerla'),entry('1098b30-31','Argumento: concordancia con otras opiniones'),entry('1102a28-32','Definición: distinción sin separación')]},
 {id:'phusis',title:'Phýsis · naturaleza',gr:'φύσις φύσεως φύσει φύσιν φύσεις φύσεων φύσεσι φύσεσιν',es:'naturaleza naturalezas natural naturales',sheets:['faq.lab.alma','faq.lab.virtudes'],maps:['alma'],definition:[],allusions:[entry('1102b13-14','Otra naturaleza irracional del alma'),entry('1103a1-3','Distinción de los modos de poseer razón')]}
];
export const fold=s=>String(s??'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/ς/g,'σ');
export function occurrences(text,forms){
 const words=new Set(forms.split(/\s+/).filter(Boolean).map(fold));
 return [...String(text??'').matchAll(/[\p{L}\p{M}]+/gu)].filter(m=>words.has(fold(m[0]))).map(m=>({form:m[0],start:m.index,end:m.index+m[0].length}));
}
export function buildTree(concept,docs,links,editorialReady){
 const sub=new Map(docs.filter(d=>d.kind==='subunidad').map(d=>[d.sourceId,d]));
 const groups=new Map(); let gr=0,es=0;
 for(const d of docs.filter(d=>d.kind==='parrafo')){
  const hits={gr:occurrences(d.gr,concept.gr),es:occurrences(d.es,concept.es)};
  if(!hits.gr.length&&!hits.es.length)continue;
  gr+=hits.gr.length;es+=hits.es.length;
  if(!groups.has(d.chapter))groups.set(d.chapter,[]);groups.get(d.chapter).push({doc:d,hits});
 }
 const refs=items=>editorialReady?items.map(item=>{
  const doc=sub.get(item.id); const sheets=links.get(item.id)||[];
  return {...item,doc:doc?.es&&doc?.gr?doc:null,sheets,registered:sheets.length>0};
 }):[];
 return {concept,chapters:[...groups].sort((a,b)=>a[0]-b[0]),counts:{gr,es},definition:refs(concept.definition),allusions:refs(concept.allusions),editorialReady};
}
