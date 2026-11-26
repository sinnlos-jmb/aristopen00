import {Router} from 'express';
import {requireEditor} from '../middleware/require-editor.js';
import {asyncHandler as h} from '../utils/async-handler.js';
import {HttpError} from '../utils/http-error.js';
import {validateTreeLayout,layoutName} from '../../public/js/lab/tagTreePersistence.js';
import {createTreeLayoutStore} from '../labo/tree-layout-store.js';
import {getPool} from '../utils/db.js';
export function createTreeLayoutsRouter({store,authorize=requireEditor}={}){
 const r=Router();const repo=()=>store||createTreeLayoutStore(getPool());
 const checked=f=>{try{return f();}catch(e){throw new HttpError(400,e.message);}};
 r.use(authorize);r.use((_req,res,next)=>{res.set('Cache-Control','no-store');next();});
 r.get('/',h(async(_req,res)=>res.json({layouts:await repo().list()})));
 r.get('/:name',h(async(req,res)=>{const name=checked(()=>layoutName(req.params.name)),layout=await repo().get(name);if(!layout)throw new HttpError(404,'Disposición no encontrada.');res.json({name,layout});}));
 r.put('/:name',h(async(req,res)=>{const name=checked(()=>layoutName(req.params.name)),layout=checked(()=>validateTreeLayout(req.body));res.json(await repo().save(name,layout));}));
 return r;
}
