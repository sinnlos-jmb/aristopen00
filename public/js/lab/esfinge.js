// Ejercicios provisionales de Ágora, no citas ni transcripciones de Colli.
// Cada refutación tiene una condición explícita. No hay evaluación por mayoría de respuestas.
export const desafios=Object.freeze([
  {id:'posesion',titulo:'Posesión y ejercicio de la virtud',tesis:'La mera posesión de la virtud basta para ser feliz, incluso sin ejercerla.',
    preguntas:[
      '¿Admitís como caso posible que alguien posea la virtud, pero permanezca inactivo durante toda su vida?',
      'En ese mismo caso hipotético, ¿admitís que esa persona no sería feliz?'
    ],
    inferencia:'La primera respuesta admite un caso posible de posesión sin ejercicio. La tesis inicial implica que esa persona sería feliz; la segunda premisa afirma que no lo sería. Las afirmaciones resultan incompatibles dentro del caso admitido.',
    distincion:'Poseer una disposición (héxis) no es lo mismo que realizar una actividad (enérgeia) conforme a ella. El contraejemplo examina la suficiencia de la posesión, no demuestra por sí solo toda la definición de felicidad.',
    referencias:'EN I.8, 1098b30–1099a3; I.10, 1100a3–5.',
    apoyo:'Aristóteles distingue la disposición de su actividad y considera al que duerme o permanece inactivo; luego recuerda la exigencia de virtud completa en una vida entera.',
    enlaces:[['#/fichas/felicidad','¿Qué es la felicidad?'],['#/grafos/felicidad','Mapa: Condiciones de la felicidad'],['#/grafos/confirmacion','Mapa: La confirmación']]},
  {id:'fin',titulo:'El fin y lo que se elige por sí mismo',tesis:'La felicidad se elige exclusivamente como medio para conseguir otro bien.',
    preguntas:[
      '¿Admitís que podemos elegir la felicidad por sí misma, aun si no nos proporciona otro bien?',
      '¿Admitís que elegir algo por sí mismo es incompatible con elegirlo exclusivamente como medio para otra cosa?'
    ],
    inferencia:'Si elegimos la felicidad por sí misma y esa elección excluye que se la elija exclusivamente como medio, no puede ser verdadero a la vez que se la elige exclusivamente como medio. Las premisas admitidas refutan la tesis inicial.',
    distincion:'Un bien puede elegirse por sí mismo y también en vista de otro. Lo que aquí se refuta es la exclusividad de la relación instrumental, no toda relación entre bienes.',
    referencias:'EN I.7, 1097a25–b6.',
    apoyo:'Aristóteles diferencia los fines por su completitud y caracteriza la felicidad como aquello que se elige siempre por sí mismo y nunca por otra cosa.',
    enlaces:[['#/fichas/felicidad','¿Qué es la felicidad?'],['#/grafos/forma','Mapa: La forma del fin'],['#/grafos/felicidad','Mapa: Condiciones de la felicidad']]}
]);
export const opciones=Object.freeze([['si','Sí, lo admito'],['no','No lo admito'],['duda','Necesito distinguir o precisar']]);
const get=id=>{const d=desafios.find(x=>x.id===id);if(!d)throw Error('Desafío desconocido.');return d;};
export function iniciarEsfinge(id){get(id);return {id,respuestas:[]};}
export function preguntasEsfinge(s){const d=get(s.id);return [d.tesis,...d.preguntas];}
export function resultadoEsfinge(s){
  const d=get(s.id),r=s.respuestas;
  if(!r.length)return null;
  if(r[0]!=='si')return {estado:'tesis_no_asumida',texto:'No asumiste la tesis inicial. Por lo tanto no hay tesis aceptada que refutar. Podés reiniciar, elegir otro desafío o examinar los pasajes.'};
  if(r.length<1+d.preguntas.length)return null;
  if(r.every(x=>x==='si'))return {estado:'refutacion',texto:d.inferencia};
  return {estado:'sin_refutacion',texto:'No se obtuvo una refutación a partir de tus respuestas. Alguna de las premisas necesarias fue rechazada o quedó en duda; no se la puede usar como si hubiera sido admitida. Conviene precisar esa premisa y revisar el texto.'};
}
export function responderEsfinge(s,r){
  if(!opciones.some(([id])=>id===r)||resultadoEsfinge(s))throw Error('Respuesta no admitida en este estado.');
  return {...s,respuestas:[...s.respuestas,r]};
}
export function retrocederEsfinge(s){return {...s,respuestas:s.respuestas.slice(0,-1)};}
