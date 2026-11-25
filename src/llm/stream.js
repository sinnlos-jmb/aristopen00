// N1-U.17.2 · Lector SSE de OpenRouter (Chat Completions).
// Distingue contenido visible de razonamiento interno y gestiona chunks fragmentados.
export const streamText = raw => typeof raw==='string' ? raw
  : Array.isArray(raw) ? raw.filter(p=>['text','output_text'].includes(p?.type) && typeof p.text==='string').map(p=>p.text).join('') : '';

export async function readOpenRouterStream(response,{onDelta=()=>{},maxChars=12000}={}){
  if(!response?.body?.getReader)throw new Error('La respuesta del proveedor no permite streaming.');
  const reader=response.body.getReader(), decoder=new TextDecoder();
  let buffer='',lines=[], answer='', model='', finishReason='', usage=null, gotDone=false, generationId='';
  function event(data){
    if(!data || data==='[DONE]'){if(data==='[DONE]')gotDone=true;return;}
    let chunk;try{chunk=JSON.parse(data);}catch{throw new Error('OpenRouter envió un evento SSE inválido.');}
    if(chunk.error || chunk.choices?.[0]?.finish_reason==='error')throw new Error('OpenRouter interrumpió la generación (error del proveedor).');
    if(typeof chunk.model==='string')model=chunk.model;
    if(typeof chunk.id==='string')generationId=chunk.id.slice(0,140);
    if(chunk.usage)usage={promptTokens:Number.isFinite(chunk.usage.prompt_tokens)?chunk.usage.prompt_tokens:null,
      completionTokens:Number.isFinite(chunk.usage.completion_tokens)?chunk.usage.completion_tokens:null};
    const choice=chunk.choices?.[0];
    if(typeof choice?.finish_reason==='string')finishReason=choice.finish_reason;
    const delta=streamText(choice?.delta?.content);
    if(delta){
      if(answer.length+delta.length>maxChars)throw new Error('La respuesta excedió el máximo permitido por Ágora.');
      answer+=delta;onDelta(delta);
    }
  }
  function line(s){
    if(s.endsWith('\r'))s=s.slice(0,-1);
    if(s==='') {if(lines.length){event(lines.join('\n'));lines=[];}return;}
    if(s.startsWith('data:'))lines.push(s.slice(5).replace(/^ /,''));
  }
  try{
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      buffer+=decoder.decode(value,{stream:true});
      if(buffer.length>1_000_000)throw new Error('Evento SSE demasiado grande.');
      let n;while((n=buffer.indexOf('\n'))!==-1){line(buffer.slice(0,n));buffer=buffer.slice(n+1);}
    }
    buffer+=decoder.decode();if(buffer)line(buffer);if(lines.length)event(lines.join('\n'));
    if(!gotDone && !finishReason)throw new Error('La transmisión de OpenRouter se cortó antes de finalizar.');
    if(!answer.trim())throw new Error(`OpenRouter finalizó sin texto visible (fin=${finishReason||'no_indicado'}; modelo=${model||'no_indicado'}).`);
    return {answer,model,usage,finishReason:finishReason||'no_indicado',generationId,
      incomplete:finishReason==='length'};
  }finally{reader.releaseLock();}
}
