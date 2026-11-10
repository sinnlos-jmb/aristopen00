import {exportZero,importZero} from './fase-cero.js';
export const STREAM_KEY='eni.labo.fase0.stream.v1';
export const STREAM_FORMAT='eni-labo-fase-cero-stream';
export const exportStream=(state,model)=>({...exportZero(state,model),format:STREAM_FORMAT});
export function importStream(payload,model){if(payload?.format!==STREAM_FORMAT)throw Error('No es una exportación compatible de la variante stream. Los registros de las variantes se mantienen separados.');return importZero({...payload,format:'eni-labo-fase-cero'},model);}
