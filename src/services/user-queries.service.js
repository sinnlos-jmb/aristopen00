import { getPool } from '../utils/db.js';
import { listFaqs } from '../repositories/faqs.repository.js';
import { validarQuery, clasificarFaq } from './user-queries.contract.js';

export async function registrarQuery(body, db = getPool()) {
  const value = validarQuery(body);
  const faqs = await listFaqs(db);
  const match = clasificarFaq(value.textoInicial, faqs);
  const result = await db.query(`INSERT INTO user_queries
    (texto_inicial, consulta_json, estado_sesion, aportes_libres_json, faq_match_estado, faq_match_id)
    VALUES (?, ?, ?, ?, ?, ?)`, [value.textoInicial, JSON.stringify(value.consulta), value.estado,
    JSON.stringify(value.agregados), match.estado, match.faqId]);
  return { id: Number(result.insertId), faqMatch: match.estado, faqId: match.faqId, aportesLibres: value.agregados.length };
}
