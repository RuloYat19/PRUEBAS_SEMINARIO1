import { Router } from 'express';
import { ZodError } from 'zod';
import { PerfilController } from './perfil.controller.js';
import { PerfilError } from './perfil.errors.js';

export function createPerfilRouter(perfilService) {
  const router = Router();
  const controller = new PerfilController(perfilService);

  router.get('/', controller.obtener);
  router.put('/', controller.actualizar);

  router.use((error, request, response, next) => {
    if (error instanceof ZodError) {
      return response.status(400).json({ error: error.issues[0].message });
    }
    if (error instanceof PerfilError) {
      return response.status(error.statusCode).json({ error: error.message });
    }
    return next(error);
  });

  return router;
}
