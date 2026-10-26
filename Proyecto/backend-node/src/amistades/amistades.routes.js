import { Router } from 'express';
import { AmistadesController } from './amistades.controller.js';
import { AmistadesError } from './amistades.errors.js';
import { asyncHandler } from '../shared/middleware/async-handler.js';

export function createAmistadesRouter(service) {
  const router = Router();
  const controller = new AmistadesController(service);
  router.get('/', asyncHandler(controller.listar));
  router.get('/personas', asyncHandler(controller.personas));
  router.get('/solicitudes', asyncHandler(controller.solicitudes));
  router.post('/solicitudes', asyncHandler(controller.enviar));
  router.put('/solicitudes/:id', asyncHandler(controller.responder));
  router.use((error, _request, response, next) => {
    if (error instanceof AmistadesError) return response.status(error.statusCode).json({ error: error.message });
    return next(error);
  });
  return router;
}
