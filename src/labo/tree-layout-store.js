import {validateTreeLayout,layoutName} from '../../public/js/lab/tagTreePersistence.js';
// Shared editorial workspace. No student identity or credentials stored here.
export function createTreeLayoutStore(db){return {
 async list(){return db.query('SELECT nombre, revision_corpus, actualizado FROM grafo_disposiciones ORDER BY actualizado DESC, nombre LIMIT 100');},
 async get(name){const rows=await db.query('SELECT disposicion_json FROM grafo_disposiciones WHERE nombre=?',[layoutName(name)]);return rows.length?validateTreeLayout(typeof rows[0].disposicion_json==='string'?JSON.parse(rows[0].disposicion_json):rows[0].disposicion_json):null;},
 async save(name,value){name=layoutName(name);const layout=validateTreeLayout(value);await db.query('INSERT INTO grafo_disposiciones (nombre, revision_corpus, disposicion_json) VALUES (?,?,?) ON DUPLICATE KEY UPDATE revision_corpus=VALUES(revision_corpus), disposicion_json=VALUES(disposicion_json), actualizado=CURRENT_TIMESTAMP(6)',[name,layout.revision,JSON.stringify(layout)]);return {name};}
};}
