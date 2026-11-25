import { esc } from '../ui.js';
// Subconjunto deliberado: sin HTML remoto, imágenes, enlaces activos ni atributos.
function inline(s){
  let out='',last=0;
  const re=/`([^`\n]+)`|\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|__([^_\n]+)__/g;
  for(const m of s.matchAll(re)){
    out+=esc(s.slice(last,m.index));
    const tag=m[1]?'code':m[2]||m[4]?'strong':'em';
    out+=`<${tag}>${esc(m[1]||m[2]||m[3]||m[4])}</${tag}>`;
    last=m.index+m[0].length;
  }
  return out+esc(s.slice(last));
}
export function renderLLMMarkdown(text){
  const lines=String(text??'').replace(/\r\n?/g,'\n').split('\n');
  let out='',para=[],list=[],kind='',code=null;
  const flush=()=>{if(para.length){out+=`<p>${para.map(inline).join('<br>')}</p>`;para=[];}if(list.length){out+=`<${kind}>${list.map(t=>`<li>${inline(t)}</li>`).join('')}</${kind}>`;list=[];kind='';}};
  const flushCode=()=>{out+=`<pre><code>${esc(code.join('\n'))}</code></pre>`;code=null;};
  for(const line of lines){
    const oneLine=/^\s*```(?:[a-zA-Z0-9_-]+)?[ \t]+(.+?)```\s*$/.exec(line);
    if(code===null&&oneLine){flush();code=[oneLine[1]];flushCode();continue;}
    if(/^\s*```/.test(line)){if(code!==null)flushCode();else{flush();code=[];}continue;}
    if(code!==null){code.push(line);continue;}
    if(!line.trim()){flush();continue;}
    const h=/^#{1,6}\s+(.+)$/.exec(line);if(h){flush();out+=`<h4>${inline(h[1])}</h4>`;continue;}
    const m=/^\s*(?:([-+*])|(\d+)\.)\s+(.+)$/.exec(line);
    if(m){const k=m[1]?'ul':'ol';if(para.length||kind&&kind!==k)flush();kind=k;list.push(m[3]);continue;}
    if(list.length)flush();para.push(line);
  }
  if(code!==null)flushCode();flush();return out;
}
