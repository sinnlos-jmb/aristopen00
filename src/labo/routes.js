// Prototipo de API: un índice y todos sus modelos pertenecen a una misma revisión.
import {Router} from 'express';
import {asyncHandler as h} from '../utils/async-handler.js';
import {HttpError} from '../utils/http-error.js';
import {crearServicioCorpus} from './corpus-service.js';
import {loadPublicModule} from '../utils/public-module.js';
const notFound = new HttpError(404,'Modelo no encontrado.');
const bad = message => new HttpError(400,message);
const conflict = () => new HttpError(409,'Los datos cambiaron. Recargá para continuar con una sola versión.');

function indexar(c) {
  const byId=new Map(c.fragments.map(x=>[x.id,x]));
  const criterionById=new Map(c.catalog.criteria.map(x=>[x.id,x]));
  return {...c,byId,criterionById};
}
export function crearLaboRouter(options={}) {
 const {servicio=crearServicioCorpus(), buscador, comandos}=options;
 // Evitar heredar Object.prototype.constructor cuando no se inyectó un módulo.
 const constructor=Object.hasOwn(options,'constructor') ? options.constructor : null;
 const r=Router();
 let searchModules=null;
 const mod=async()=>searchModules ||= Promise.all([
   buscador || loadPublicModule('labo/js/buscar.js'),
   constructor || loadPublicModule('labo/js/constructor.js')
 ]);
 const read=async revision=>{const data=await servicio.obtener();if(typeof revision!=='string'||revision!==data.sourceHash)throw conflict();return data;};
 const send=(res,value)=>res.set('Cache-Control','no-store').json(value);
 r.get('/inicio',h(async(_req,res)=>{
   const {corpus,constructor:model,sourceHash,avisos}=await servicio.obtener();
   const {fragments,...meta}=corpus;
   return send(res,{revision:sourceHash,corpus:meta,constructor:model,avisos});
 }));
 r.get('/lectura',h(async(req,res)=>{
   // La revisión es opcional al iniciar; al continuar se rechaza cualquier mezcla.
   const data=req.query.revision===undefined?await servicio.obtener():await read(req.query.revision);
   return send(res,{revision:data.sourceHash,...data.lectura});
 }));
 r.get('/grafos/:archivo',h(async(req,res)=>{
   const data=req.query.revision===undefined?await servicio.obtener():await read(req.query.revision);
   const graph=data.grafos.find(x=>x.graph.file===req.params.archivo);
   if(!graph)throw new HttpError(404,'Grafo no encontrado.');
   return send(res,{revision:data.sourceHash,graph:graph.graph,datos:graph.data,indice:data.lectura.graphIndex});
 }));
 r.get('/modelos/:modelo',h(async(req,res)=>{
   const data=await read(req.query.revision); const result=req.params.modelo==='bot'?data.bot:req.params.modelo==='fase'?data.fase:null;
   if(!result)throw notFound;return send(res,{revision:data.sourceHash,modelo:result,compatibles:data.compatibles?.[req.params.modelo]||[]});
 }));
 r.post('/fragmentos',h(async(req,res)=>{
   const {revision,ids}=req.body||{};
   if(!Array.isArray(ids)||ids.length>100||ids.some(x=>typeof x!=='string'||x.length>256))throw bad('Pedí hasta 100 identificadores válidos.');
   const data=await read(revision);const map=new Map(data.corpus.fragments.map(x=>[x.id,x]));
   return send(res,{revision:data.sourceHash,fragmentos:[...new Set(ids)].map(id=>map.get(id)).filter(Boolean),faltantes:[...new Set(ids)].filter(id=>!map.has(id))});
 }));
 r.post('/comando',h(async(req,res)=>{
   const {revision,tipo,pregunta,ubicacion}=req.body||{};
   if(!['query','ia','mapa'].includes(tipo))throw bad('Comando inválido.');
   if(tipo!=='mapa'&&(typeof pregunta!=='string'||!pregunta.trim()||pregunta.length>2000))throw bad('Consulta inválida.');
   const data=await read(revision),c=indexar(data.corpus);
   const cmd=await (comandos||loadPublicModule('labo/js/bot-commands.js'));
   let text;
   if(tipo==='mapa'){
     const u=ubicacion,ids=data.fase.topics.map(t=>t.id);
     if(!u||!['initial','stage','concept'].includes(u.level)||!(u.topic===null||ids.includes(u.topic))||!['menu','lesson','review','closure','relation','final'].includes(u.screen)||!(u.review===null||(Number.isInteger(u.review)&&u.review>=0&&u.review<3))||!u.topics||ids.some(id=>!u.topics[id]||!Number.isInteger(u.topics[id].index)||u.topics[id].index<0||u.topics[id].index>2||typeof u.topics[id].done!=='boolean'))throw bad('Ubicación inválida.');
     const safe={ui:{level:u.level,topic:u.topic,screen:u.screen,review:u.review},core:{topics:Object.fromEntries(ids.map(id=>[id,{index:u.topics[id].index,done:u.topics[id].done}]))}};
     text=cmd.mapReply(safe,data.fase,c);
   }else if(tipo==='ia')text=cmd.iaReply(pregunta,c);
   else try{text=cmd.queryReply(pregunta,c).text;}catch(e){text=`Query no válida: ${e.message}\nNo se ejecutó la recuperación. query? muestra la sintaxis.`;}
   return send(res,{revision:data.sourceHash,tipo,text});
 }));
 r.post('/buscar',h(async(req,res)=>{
   const {revision,modo,query,builder,options={}}=req.body||{};
   if(!options || typeof options!=='object' || Array.isArray(options))throw bad('Opciones inválidas.');
   if(options.criteria!=null&&(!Array.isArray(options.criteria)||options.criteria.length>3||options.criteria.some(x=>typeof x!=='string'||x.length>256)))throw bad('Criterios inválidos.');
   if(options.sources!=null&&(!Array.isArray(options.sources)||options.sources.length>10||options.sources.some(x=>typeof x!=='string'||x.length>80)))throw bad('Fuentes inválidas.');
   if(modo==='libre'&&(typeof query!=='string'||query.length>2000))throw bad('Consulta inválida.');
   if(modo==='guiada'&&(!builder||typeof builder!=='object'||Array.isArray(builder)))throw bad('Consulta guiada inválida.');
   if(!['libre','guiada'].includes(modo))throw bad('Modo inválido.');
   const data=await read(revision),c=indexar(data.corpus),[s,b]=await mod();
   let result;
   if(modo==='libre') result={results:s.searchLexical(c,query,options)};
   else result=b.searchBuilder(c,data.constructor,b.cleanBuilder(builder,c,data.constructor),options);
   return send(res,{revision:data.sourceHash,...result});
 }));
 return r;
}
