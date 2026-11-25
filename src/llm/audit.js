// N1-U.17.2 · Registro editorial de consultas. Sin cookies, claves, IP ni pasajes completos.

const clean = (value,max=160) => String(value??'').slice(0,max);
const asJson = value => JSON.stringify(value??[]);
export function createLLMAudit({enabled=process.env.AGORA_LLM_AUDIT_ENABLED==='1', db=null}={}){
  return {
    enabled,
    async record(event){
      if(!enabled)return false;
      const pool=db||(await import('../utils/db.js')).getPool();
      const status=['ok','error','parcial'].includes(event.status)?event.status:'error';
      await pool.query(`INSERT INTO llm_interacciones
        (request_id, sesion_hash, modalidad, pregunta, respuesta, estado,
         modelo, fin_motivo, prompt_version, revision_corpus, fuentes_json,
         fichas_json, tokens_entrada, tokens_salida, error_tipo, incompleta,
         auditoria_llm, auditoria_disponible${event.graphTrace ? ", grafo_json" : ""})
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?${event.graphTrace ? ",?" : ""})
        ON DUPLICATE KEY UPDATE request_id=VALUES(request_id)`,[
        clean(event.requestId,100),clean(event.sessionHash,64),clean(event.mode,20),clean(event.question,1500),
        clean(event.answer,12000),status,clean(event.model,160),clean(event.finishReason,40),
        clean(event.promptVersion,90),clean(event.revision,128),asJson(event.sources),asJson(event.fichas),
        Number.isInteger(event.usage?.promptTokens)?event.usage.promptTokens:null,
        Number.isInteger(event.usage?.completionTokens)?event.usage.completionTokens:null,
        clean(event.errorCode,70),Boolean(event.incomplete)?1:0,
        clean(event.editorialAudit,4000),event.editorialAudit?.trim()?1:0,
        ...(event.graphTrace?[asJson(event.graphTrace)]:[]),
      ]);
      return true;
    },
  };
}
