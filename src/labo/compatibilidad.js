import crypto from 'node:crypto';
function ordenado(v) { return Array.isArray(v)?v.map(ordenado):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,ordenado(v[k])])):v; }
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
export const huellaEditorial=e=>hash(JSON.stringify(ordenado(e)));
// Solo reconoce un modelo anterior si su hash es íntegro y sus datos editoriales son idénticos.
export function registrarModeloAnterior(modelo, editorial) {
 if(!modelo || typeof modelo.contentHash!=='string' || typeof modelo.corpusHash!=='string')throw Error('Modelo anterior inválido.');
 const {contentHash,corpusHash,...resto}=modelo;
 const sinHash={...resto,corpusHash};
 if(hash(JSON.stringify(sinHash))!==contentHash)throw Error('La huella del modelo anterior no coincide.');
 if(huellaEditorial(resto)!==huellaEditorial(editorial))throw Error('El modelo anterior no coincide con el guion editorial.');
 return {hash:contentHash, editorialHash:huellaEditorial(editorial)};
}
export function compatibilidades(editorial) {
 return Object.fromEntries(['bot','fase'].map(tipo=>[tipo,[...new Set((editorial.legados?.[tipo]||[])
  .filter(x=>/^[a-f0-9]{64}$/.test(x?.hash||'')&&x.editorialHash===huellaEditorial(editorial[tipo]))
  .map(x=>x.hash))]]));
}
