// Comandos: recuperación verificable, sin generación automática.
import {normalize,searchLexical} from './buscar.js';
const cleanName=s=>normalize(s).replace(/^(el|la|los|las|un|una)\s+/,'');
const ALIASES={felicidad:'eudaimonia',eudaimonia:'eudaimonia',naturaleza:'phusis',phusis:'phusis',alma:'psuche',psuche:'psuche',psyche:'psuche',virtud:'arete',excelencia:'arete',arete:'arete',actividad:'energeia_actividad',energeia:'energeia_actividad',energeia_actividad:'energeia_actividad',capacidad:'dunamis',potencia:'dunamis',dunamis:'dunamis',contemplacion:'theoria',theoria:'theoria',praxis:'praxis',accion:'praxis',hexis:'hexis',disposicion:'hexis'};
export const KEYWORD_HELP={
 '?':'Palabras clave disponibles:\nmenu — opciones numéricas del contexto actual.\nI.A. — escritura libre; OpenRouter todavía no está conectado.\nmapa — ubicación actual y referencias bibliográficas indexadas.\nquery — relación entre dos conceptos o grupos de conceptos.\nI.A.?, mapa? y query? explican su funcionamiento.\nLos números eligen opciones del menú visible. Enter vacío completa la escritura simulada. Las consultas y el mapa solicitan datos al servidor; el historial se guarda en este navegador.',
 'ia':'I.A. — escritura libre\nEscribí I.A. para abrir este modo y luego tu pregunta, o I.A. seguido de la pregunta. Los números también son texto libre en este modo. menu vuelve a las opciones.\nPor ahora se guarda la pregunta y se envía la consulta al servidor y se recuperan hasta tres pasajes del corpus. No hay respuesta generada: OpenRouter no está conectado ni se usan claves. Este contexto local queda preparado para la futura integración RAG, que requerirá autorización y revisión propias.',
 'mapa':'mapa — dónde estás\nMuestra etapa, concepto y ficha actuales, además del avance registrado. Para un concepto activo, lista libros/obras y referencias presentes en sus fichas o en el índice local. Son referencias indexadas, no un inventario completo de Aristóteles ni una afirmación de que estén cargados esos libros íntegros. En el inicio no se inventa un concepto activo. No cambia el avance.',
 'query':'query — relaciones agrupadas\nEscribí query y luego una relación, o query seguido de ella. Solo se admite: relación entre A y B. A y B pueden ser conceptos o grupos unidos por y entre paréntesis; se admite anidación.\nEjemplos:\nrelación entre la felicidad y (la contemplación [theoria] y la praxis)\nrelación entre (la actividad [energeia] y la capacidad [dunamis]) y la virtud [arete]\nLos corchetes identifican el término; deben corresponder al concepto español. Se conservan ambos grupos: no se inventa una arista ni se deduce una relación causal.\nMáximo: 8 conceptos, 4 niveles de paréntesis y 2000 caracteres. Se buscan párrafos con etiquetas de todos los conceptos. Si no hay cruce completo, se informa sin relajar la consulta. El corpus textual cargado es EN I; referencias a otros libros no equivalen a texto íntegro disponible. menu sale de query.'
};
export function resolveConcept(raw,corpus){
 const match=raw.trim().match(/^([^\[\]]+?)(?:\s*\[([^\[\]]+)\])?$/);if(!match)throw Error('Concepto o corchetes no válidos.');
 const name=cleanName(match[1]),catalog=corpus.catalog.criteria.filter(x=>x.type==='static_concept'||x.id.startsWith('static:'));
 const resolve=s=>{const k=cleanName(s),alias=ALIASES[k];if(alias)return catalog.find(x=>x.id==='static:'+alias);const found=catalog.filter(x=>cleanName(x.label)===k||cleanName(x.entityId)===k||cleanName(x.greek)===k);return found.length===1?found[0]:null;};
 const item=resolve(name);if(!item)throw Error(`Concepto no reconocido: ${match[1].trim()}. Usá el nombre del índice local o un término entre corchetes junto con su nombre español.`);
 if(match[2]&&resolve(match[2])?.id!==item.id)throw Error(`El término [${match[2]}] no corresponde a ${match[1].trim()}.`);
 // Capacidad específica y potencia comparten las etiquetas que ya declara el índice.
 const ids=item.id==='static:dunamis'?['static:dunamis','static:dunamis_capacidad','func:dunamis']:item.id==='static:energeia_actividad'?['static:energeia_actividad','static:energeia','func:actividad']:[item.id,'func:'+item.id.slice(7)];
 return {type:'concept',id:item.id,label:item.label,ids};
}
export function parseRelation(text,corpus){
 if(typeof text!=='string'||text.length>2000)throw Error('La query admite hasta 2000 caracteres.');
 let s=text.trim().replace(/^relaci[oó]n\s+entre\s+/i,'').replace(/[.。]\s*$/,'');if(!s)throw Error('Escribí relación entre A y B.');
 let depth=0,bracket=0;const cuts=[];
 for(let i=0;i<s.length;i++){const x=s[i];if(x==='['){if(bracket)throw Error('Corchetes anidados no válidos.');bracket++;}else if(x===']'){if(--bracket<0)throw Error('Corchetes sin abrir.');}else if(!bracket){if(x==='('){if(++depth>4)throw Error('Máximo 4 niveles de paréntesis.');}if(x===')'&&--depth<0)throw Error('Paréntesis sin abrir.');if(depth===0&&/\s/.test(s[i-1]||'')&&/[yY]/.test(x)&&/\s/.test(s[i+1]||''))cuts.push(i);}}
 if(depth||bracket)throw Error('Cerrá todos los paréntesis y corchetes.');
 if(cuts.length!==1)throw Error('Separá exactamente dos lados con y; agrupá conceptos adicionales entre paréntesis.');
 let count=0;
 function operand(x,level=0){x=x.trim();if(!x)throw Error('Hay un grupo o concepto vacío.');if(x[0]==='('){if(x.at(-1)!==')')throw Error('El grupo debe terminar en paréntesis.');const inner=x.slice(1,-1);let d=0,b=0,start=0,parts=[];for(let i=0;i<inner.length;i++){if(inner[i]==='[')b++;else if(inner[i]===']')b--;else if(!b){if(inner[i]==='(')d++;if(inner[i]===')')d--;if(d<0)throw Error('Paréntesis mal agrupados.');if(d===0&&/\s/.test(inner[i-1]||'')&&/[yY]/.test(inner[i])&&/\s/.test(inner[i+1]||'')){parts.push(inner.slice(start,i));start=i+1;}}}parts.push(inner.slice(start));if(parts.length<2)throw Error('Un grupo debe contener al menos dos conceptos unidos por y.');if(level>=4)throw Error('Máximo 4 niveles de paréntesis.');return {type:'group',op:'and',items:parts.map(p=>operand(p,level+1))};}
 if(/[()]/.test(x))throw Error('Paréntesis mal agrupados.');if(++count>8)throw Error('Máximo 8 conceptos.');return resolveConcept(x,corpus);}
 const left=operand(s.slice(0,cuts[0])),right=operand(s.slice(cuts[0]+1));return {type:'relation',left,right};
}
export const leaves=node=>node.type==='concept'?[node]:node.type==='relation'?[...leaves(node.left),...leaves(node.right)]:node.items.flatMap(leaves);
export const describe=node=>node.type==='concept'?node.label:node.type==='relation'?`${describe(node.left)} ↔ ${describe(node.right)}`:`(${node.items.map(describe).join(' y ')})`;
const excerpt=s=>s.length>440?s.slice(0,437)+'…':s;
function hitText(item){return `${item.ref} · ${item.title}\nTraducción del corpus: ${excerpt(item.text)}`;}
export function queryReply(input,c){
 const ast=parseRelation(input,c),terms=[...new Map(leaves(ast).map(x=>[x.id,x])).values()];
 const hits=c.fragments.filter(f=>f.source==='texto'&&f.language==='es'&&terms.every(t=>f.criteria.some(q=>t.ids.includes(q.id)))).slice(0,4);
 return {ast,text:`Query interpretada: ${describe(ast)}.\nIzquierda: ${describe(ast.left)}.\nDerecha: ${describe(ast.right)}.\nAgrupación conservada; no afirma una relación filosófica ni genera una respuesta.\n\n${hits.length?`Párrafos de EN I etiquetados con todos los conceptos (máximo 4):\n${hits.map(hitText).join('\n\n')}`:'No se encontraron párrafos de EN I con etiquetas de todos los conceptos. No se amplía la búsqueda automáticamente; esto no demuestra que no exista relación.'}\n\nRecuperación estructurada, no inferencia. Escribí otra relación o menu.`};
}
export function iaReply(prompt,c){
 const hits=searchLexical(c,prompt,{sources:['paragraphs'],scope:'en1',limit:5}).slice(0,3);
 return `La consulta se envió al servidor; el historial se guarda en este navegador. OpenRouter no está conectado: no hay respuesta generada.\n\nContexto recuperado para la futura integración RAG (búsqueda léxica, no validación de la pregunta):\n${hits.length?hits.map(h=>hitText(h.item)).join('\n\n'):'No se recuperaron párrafos con esta búsqueda léxica.'}\n\nPodés escribir otra pregunta libre o menu para volver.`;
}
export function mapReply(s,m,c){
 const t=m.topics.find(t=>t.id===s.ui.topic),p=t?s.core.topics[t.id]:null;
 let text=`Ubicación: ${s.ui.level==='initial'?'menú inicial de etapas':'etapa 1 (felicidad - naturaleza - filosofía práctica)'}.\nConcepto activo: ${t?t.title:'ninguno'}.`;
 if(p)text+=`\nFicha actual: ${s.ui.screen==='review'?(s.ui.review??p.index)+1:p.index+1} de 3. Avance del concepto: ${p.done?'completado':'en recorrido'}.`;
 text+=`\nConceptos completados: ${m.topics.filter(x=>s.core.topics[x.id].done).length} de 3.\nLas etapas 2 y 3 todavía no tienen contenido preparado.`;
 if(!t)return text+'\nEntrá a un concepto y escribí mapa para ver sus referencias indexadas.';
 const ids=t.id==='felicidad'?['static:eudaimonia','func:eudaimonia']:t.id==='naturaleza'?['static:phusis','func:phusis']:[];
 const refs=[...new Set([...t.cards.flatMap(x=>x.paragraphs).map(n=>c.byId?.get(`texto:p${n}:es`)?.ref),...c.fragments.filter(f=>f.criteria?.some(x=>ids.includes(x.id))).map(f=>f.ref)].filter(Boolean))];
 const books=new Set();for(const ref of refs){let work=null;for(const part of ref.split(';')){const w=part.match(/\b(EN|EE|Phys\.|Met\.|Pol\.|De An\.|Cat\.)\s*/);if(w)work=w[1];const r=(w?part.slice(w.index+w[0].length):part).match(/^\s*([IVX]+|[Α-ΩΘΔΛ]+)(?=[.\s–-])/);if(work&&r)books.add(`${work} · libro ${r[1]}`);}}
 text+=`\n\nLibros/obras presentes en las referencias indexadas: ${[...books].sort().join('; ')||'sin localización de libro explícita'}.\nReferencias ${ids.length?'del índice y de las fichas':'de las fichas de este concepto editorial'} (muestra de hasta 6):\n${refs.slice(0,6).join('\n')||'No disponibles.'}\nNo es un inventario exhaustivo: el texto íntegro cargado es EN I. Las referencias a otras obras no implican que sus libros estén incorporados.`;
 return text;
}
