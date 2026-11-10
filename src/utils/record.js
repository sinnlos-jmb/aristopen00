// Mapeo objeto JSON ⇄ fila SQL sin pérdida de datos.
// `spec` declara las columnas propias y su tipo: 'text' | 'json' | 'bool' | 'int'.
// Lo que no encaja en una columna (campo desconocido o tipo distinto) va a `extra`.

const fits = {
  text: v => typeof v === 'string',
  bool: v => typeof v === 'boolean',
  int: v => Number.isInteger(v),
  json: () => true, // incluye null explícito: se guarda como JSON 'null'
};

export function toRow(obj, spec, { skip = [] } = {}) {
  const row = {};
  const extra = {};
  for (const [key, value] of Object.entries(obj || {})) {
    if (skip.includes(key)) continue;
    const type = spec[key];
    if (type && fits[type](value)) {
      row[key] = type === 'json' ? JSON.stringify(value) : type === 'bool' ? (value ? 1 : 0) : value;
    } else {
      extra[key] = value;
    }
  }
  row.extra = Object.keys(extra).length ? JSON.stringify(extra) : null;
  return row;
}

export function fromRow(row, spec) {
  const obj = {};
  for (const [key, type] of Object.entries(spec)) {
    const v = row[key];
    if (v === null || v === undefined) continue;
    obj[key] = type === 'json' ? parseJson(v) : type === 'bool' ? Boolean(v) : type === 'int' ? Number(v) : String(v);
  }
  return row.extra ? Object.assign(obj, parseJson(row.extra)) : obj;
}

export function parseJson(v) {
  if (v === null || v === undefined) return null;
  if (typeof v !== 'string') return v;
  return JSON.parse(v);
}

// INSERT de un objeto plano { columna: valor }.
export async function insertRow(db, table, row) {
  const cols = Object.keys(row);
  const sql = `INSERT INTO \`${table}\` (${cols.map(c => `\`${c}\``).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`;
  return db.query(sql, cols.map(c => row[c]));
}

export async function updateRow(db, table, idCol, id, row) {
  const cols = Object.keys(row);
  if (!cols.length) return { affectedRows: 0 };
  const sql = `UPDATE \`${table}\` SET ${cols.map(c => `\`${c}\` = ?`).join(', ')} WHERE \`${idCol}\` = ?`;
  return db.query(sql, [...cols.map(c => row[c]), id]);
}

// Reordena las claves de un objeto: primero las de `order` (las que existan), luego el resto.
// Solo afecta la presentación (los archivos exportados quedan con el orden editorial habitual).
export function orderKeys(obj, order) {
  const out = {};
  for (const k of order) if (k in obj) out[k] = obj[k];
  for (const k of Object.keys(obj)) if (!(k in out)) out[k] = obj[k];
  return out;
}

export const isRecord = v => v !== null && typeof v === 'object' && !Array.isArray(v);
