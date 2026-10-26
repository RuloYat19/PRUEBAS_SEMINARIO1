import { Router } from 'express';
import { IdentidadController } from './identidad.controller.js';
import { IdentidadError } from './identidad.errors.js';
import { asyncHandler } from '../shared/middleware/async-handler.js';

export function createIdentidadRouter(service) {
  const router = Router();
  const controller = new IdentidadController(service);
  router.post('/registro', asyncHandler(controller.registrar));
  router.post('/verificar', asyncHandler(controller.verificar));
  router.post('/reenviar-codigo', asyncHandler(controller.reenviarCodigo));
  router.post('/login', asyncHandler(controller.login));
  router.post('/login-facial', asyncHandler(controller.loginFacial));
  router.use((error, _request, response, next) => {
    if (error instanceof IdentidadError) return response.status(error.statusCode).json({ error: error.message });
    return next(error);
  });
  return router;
}
