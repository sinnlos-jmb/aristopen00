// Ágora N1-U.17 · Sesiones efímeras y cupos del piloto. Sólo memoria del proceso.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export function createSessionStore({ limit = 6, ttlMs = 4 * 60 * 60 * 1000, now = Date.now,
  secret = randomBytes(32), maxSessions = 2000 } = {}) {
  const sessions = new Map();
  const cookieName = 'agora_llm_session';
  const sign = id => createHmac('sha256', secret).update(id).digest('hex');
  function fromCookie(req) {
    const raw = String(req.headers?.cookie || '').split(';').map(x => x.trim())
      .find(x => x.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
    if (!raw) return null;
    const parts = raw.split('.');
    if (parts.length !== 2 || !/^[0-9a-f]{32}$/.test(parts[0]) || !/^[0-9a-f]{64}$/.test(parts[1])) return null;
    const actual = Buffer.from(parts[1], 'hex');
    const expected = Buffer.from(sign(parts[0]), 'hex');
    return timingSafeEqual(actual, expected) ? parts[0] : null;
  }
  function prune() {
    for (const [id,s] of sessions) if (now() - s.touched > ttlMs && !s.pending) sessions.delete(id);
    // Rechaza crear sesiones adicionales si el proceso está saturado; evita crecimiento ilimitado.
    return sessions.size < maxSessions;
  }
  function open(req,res) {
    const key = fromCookie(req);
    let session = key && sessions.get(key);
    if (session && now() - session.touched > ttlMs && !session.pending) {
      sessions.delete(key); session = null;
    }
    if (!session) {
      if (!prune()) return null;
      const id = randomBytes(16).toString('hex');
      session = { id, used:0, pending:0, touched:now(), requests:new Map(), turns:new Map(), labels:new Map() };
      sessions.set(id,session);
      const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
      res.setHeader('Set-Cookie', `${cookieName}=${id}.${sign(id)}; Path=/api/llm; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(ttlMs / 1000)}${secure}`);
    }
    session.touched = now();
    for (const [id,r] of session.requests) if(r.status!=='done' && r.status!=='pending' && now()-r.time > 10 * 60 * 1000) session.requests.delete(id);
    return session;
  }
  const summary = s => ({limit,used:s.used,pending:s.pending,remaining:Math.max(0,limit-s.used-s.pending)});
  function reserve(s, requestId) {
    if (s.requests.has(requestId)) return {status:'duplicate',previous:s.requests.get(requestId)};
    if (s.used + s.pending >= limit) return {status:'exhausted'};
    s.pending++;
    s.requests.set(requestId,{status:'pending',time:now()});
    return {status:'ok'};
  }
  function finish(s,requestId,result,question='') {
    const item=s.requests.get(requestId);
    if (!item || item.status!=='pending') return;
    s.pending=Math.max(0,s.pending-1);
    if (result) {s.used++;s.requests.set(requestId,{status:'done',time:now(),result});
      s.turns.set(requestId,{question,answer:result.answer,revision:result.revision,sources:result.sources||[]});}
    else s.requests.delete(requestId);
    s.touched=now();
  }
  const auditId=s=>createHmac('sha256',secret).update('audit:').update(s.id).digest('hex');
  function history(s,ids,revision) {
    const turns=ids.map(id=>s.turns.get(id));
    if(turns.some(t=>!t || t.revision!==revision))return null;
    // Conservar el orden de finalización del servidor, no el declarado por el cliente.
    const selected=new Set(ids);
    return [...s.turns].filter(([id])=>selected.has(id)).map(([,t])=>t);
  }
  function label(s,revision,id) {
    const key=JSON.stringify([revision,id]);
    if(!s.labels.has(key))s.labels.set(key,`E${s.labels.size+1}`);
    return s.labels.get(key);
  }
  return {open,summary,reserve,finish,cookieName,auditId,history,label};
}
