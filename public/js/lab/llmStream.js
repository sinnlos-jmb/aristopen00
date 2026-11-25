// Protocolo SSE de Ágora N1-U.17.2: fetch POST + eventos meta/delta/done/error.
// No interpreta HTML ni markdown remoto.
export async function readAgoraLLMStream(response,onEvent){
  const mime=response.headers?.get?.('content-type')||'';
  if(!response.ok || !mime.includes('text/event-stream')){
    const body=await response.json().catch(()=>({}));
    throw Error(body.error||`El servidor no inició streaming (HTTP ${response.status}).`);
  }
  if(!response.body?.getReader)throw Error('El navegador no soporta la lectura de streaming.');
  const reader=response.body.getReader(), decoder=new TextDecoder();
  let buffer='',eventType='message',data=[],finished=false;
  function line(value){
    if(value.endsWith('\r'))value=value.slice(0,-1);
    if(!value){
      if(data.length){
        let payload;try{payload=JSON.parse(data.join('\n'));}catch{throw Error('Evento del asistente inválido.');}
        if(eventType==='done' || eventType==='error')finished=true;
        onEvent(eventType,payload);
      }
      data=[];eventType='message';return;
    }
    if(value.startsWith('event:'))eventType=value.slice(6).trim();
    else if(value.startsWith('data:'))data.push(value.slice(5).replace(/^ /,''));
  }
  try{
    for(;;){
      const {value,done}=await reader.read();if(done)break;
      buffer+=decoder.decode(value,{stream:true});
      if(buffer.length>200_000)throw Error('La transmisión del asistente está mal formada.');
      let index;while((index=buffer.indexOf('\n'))!==-1){line(buffer.slice(0,index));buffer=buffer.slice(index+1);}
    }
    buffer+=decoder.decode();if(buffer)line(buffer);if(data.length)line('');
    if(!finished)throw Error('Se interrumpió la conexión antes del final de la respuesta.');
  }finally{reader.releaseLock();}
}
