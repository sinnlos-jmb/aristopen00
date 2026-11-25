// Separación de texto para el lector y evaluación interna, incluso con chunks SSE.
export const AUDIT_MARKER = '<<<AGORA_AUDITORIA_V2>>>';
// Algunos modelos sustituyen el marcador por un encabezado explícito.
// No se interpreta una mención ordinaria a una evaluación dentro de la explicación.
const heading=/(?:\*\*|(?:^|\n)[ \t]*(?:#{1,6}[ \t]*)?(?:\*\*)?)(?:evaluaci[oó]n[ \t]+(?:interna|editorial|del material)|auditor[ií]a[ \t]+interna)(?:[ \t]*\*\*)?[ \t]*:(?:\*\*)?/i;
const normalize=s=>s.toLowerCase().replace(/ó/g,'o').replace(/í/g,'i').replace(/\n[ \t]+/g,'\n').replace(/[ \t]+/g,' ');
// Prefijos explícitos para no demorar todos los tokens del lector: se retiene
// solamente el sufijo que podría convertirse en un separador en el próximo chunk.
const headings=['evaluacion interna','evaluacion editorial','evaluacion del material','auditoria interna'];
const prefixes=headings.flatMap(h=>['**'+h+':**','**'+h+'**:', '**'+h+':', ...['','**',...Array.from({length:6},(_,i)=>'#'.repeat(i+1)+' ')].flatMap(p=>['\n'+p+h+':','\n'+p+h+'**:','\n'+p+h+':**'])]);
export function createSectionSplitter(marker=AUDIT_MARKER){
  let pending='', phase='answer', answer='', editorialAudit='';
  function take(text){
    if(typeof text!=='string'||!text)return {answerDelta:'',auditDelta:''};
    if(phase==='audit') {editorialAudit+=text;return {answerDelta:'',auditDelta:text};}
    pending+=text;
    const at=pending.indexOf(marker);
    // No tratar el principio de un chunk como principio de una línea.
    const prefix=answer&&!answer.endsWith('\n')?'\u0000':'';
    const alt=marker===AUDIT_MARKER?heading.exec(prefix+pending):null;
    const altAt=alt?alt.index-prefix.length:-1;
    const boundary=altAt>=0&&(at<0||altAt<at)?{at:altAt,len:alt[0].length}:at>=0?{at,len:marker.length}:null;
    if(boundary){
      const answerDelta=pending.slice(0,boundary.at),auditDelta=pending.slice(boundary.at+boundary.len);
      answer+=answerDelta;editorialAudit+=auditDelta;pending='';phase='audit';
      return {answerDelta,auditDelta};
    }
    // Conservar una cola pequeña para evitar publicar un encabezado partido.
    // Se conserva también el mayor prefijo del marcador literal personalizado.
    let hold=0;
    for(let i=Math.min(pending.length,Math.max(marker.length,64));i>0;i--){
      const suffix=pending.slice(-i), normalized=normalize(suffix);
      if(marker.startsWith(suffix)||(marker===AUDIT_MARKER&&(prefixes.some(p=>p.startsWith(normalized))||(answer===''&&pending===suffix&&headings.some(h=>(h+':').startsWith(normalized)))))){hold=i;break;}
    }
    const answerDelta=pending.slice(0,pending.length-hold);
    pending=pending.slice(pending.length-hold);
    answer+=answerDelta;
    return {answerDelta,auditDelta:''};
  }
  function finish(){
    const answerDelta=pending;
    answer+=pending;pending='';
    const cleanAnswer=answer.trim(),cleanAudit=editorialAudit.trim().replace(/^\*\*\s*/, '').replaceAll(marker,'').trim();
    return {answer:cleanAnswer,editorialAudit:cleanAudit,auditMissing:!cleanAudit,answerDelta};
  }
  return {take,finish};
}
export function splitSections(text){const parser=createSectionSplitter();parser.take(text);return parser.finish();}
