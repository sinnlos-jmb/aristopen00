// Una instancia por proceso; también expira para cambios hechos por otros procesos.
import { crearServicioCorpus } from './corpus-service.js';
import { alInvalidarContenido } from '../utils/invalidacion.js';
export const servicioCorpus = crearServicioCorpus();
alInvalidarContenido(() => servicioCorpus.invalidar());
