import { compileCypher } from './queryMultimodal.js';
// Se comparte entre servidor y navegador. El código sugerido es dato, no ejecución.
export const CYPHER_GRAMMAR = `Sintaxis admitida por Ágora (no Cypher completo):
MATCH (f:Ficha)-[:RELACIONADA_CON]->(g:Ficha) WHERE f.id = 'ID' RETURN f, g
MATCH p = (f:Ficha)-[:RELACIONADA_CON*1..3]->(g:Ficha) WHERE f.id = 'ID' RETURN p
Para ambos sentidos usá -[:RELACIONADA_CON*1..3]-; para entrantes <-[:RELACIONADA_CON*1..3]-. Podés añadir AND g.id = 'ID_DESTINO' en WHERE del patrón p. Opcional SEARCH 'texto' después de RETURN. El rango admite 1..3 (también 1..1, 2..3, 3..3). Devuelve caminos simples, no necesariamente mínimos. No se admite shortestPath, filtros arbitrarios, escrituras, ni SQL. SEARCH es una extensión de Ágora de recuperación léxica dentro de los apoyos de las fichas devueltas.`;
export function validateSuggestions(answer, sheetMap){
  const accepted=[], rejected=[];
  for(const match of String(answer||'').matchAll(/```cypher\s*\n([\s\S]*?)```/gi)){
    if(accepted.length>=2)break;
    const query=match[1].trim();
    try{
      const ast=compileCypher(query);
      if(!sheetMap.has(ast.graph.fromId)||(ast.graph.toId&&!sheetMap.has(ast.graph.toId)))throw Error('Ficha inexistente.');
      if(!accepted.some(x=>x.query===query))accepted.push({query,ast});
    }catch{rejected.push('Consulta no admitida por el intérprete o ficha inexistente.');}
  }
  return {accepted,rejected};
}
