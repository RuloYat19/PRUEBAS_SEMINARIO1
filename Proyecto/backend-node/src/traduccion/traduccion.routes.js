import { Router } from 'express';
import { ZodError } from 'zod';
import { TraduccionController } from './traduccion.controller.js';
import { TraduccionError } from './traduccion.errors.js';

export function createTraduccionRouter(traduccionService) {
  const router = Router();
  const controller = new TraduccionController(traduccionService);

  router.post('/', controller.traducir);

  router.use((error, request, response, next) => {
    if (error instanceof ZodError) {
      return response.status(400).json({ error: error.issues[0].message });
    }
    if (error instanceof TraduccionError) {
      return response.status(error.statusCode).json({ error: error.message });
    }
    return next(error);
  });

  return router;
}
