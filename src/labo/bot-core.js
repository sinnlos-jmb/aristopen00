import crypto from 'node:crypto';
export function generarBot(editorial,corpus){
for(const topic of editorial.topics)for(const node of [...topic.routes,topic.revisit])for(const n of node.paragraphs){
 if(!corpus.fragments.some(f=>f.id===`texto:p${n}:es`)||!corpus.fragments.some(f=>f.id===`texto:p${n}:gr`))throw new Error(`Párrafo ausente: ${n}`);
}
const model={...editorial,corpusHash:corpus.contentHash};
model.contentHash=crypto.createHash('sha256').update(JSON.stringify(model)).digest('hex');
return model;
}
