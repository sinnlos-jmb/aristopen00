import { Router } from 'express';
import { createLLMGateway } from './gateway.js';

export function crearLLMRouter({ servicio, fetchImpl, apiKey, model, sessions }={}) {
  const gateway=createLLMGateway({
    ...(servicio ? {service:servicio} : {}),
    ...(fetchImpl ? {fetchImpl} : {}),
    ...(apiKey !== undefined ? {apiKey} : {}),
    ...(model ? {model} : {}),
    ...(sessions ? {sessions} : {}),
  });
  return Router()
    .get('/session',(req,res)=>gateway.session(req,res))
    .post('/chat',(req,res)=>gateway.chat(req,res))
    .post('/chat/stream',(req,res)=>gateway.stream(req,res));
}
