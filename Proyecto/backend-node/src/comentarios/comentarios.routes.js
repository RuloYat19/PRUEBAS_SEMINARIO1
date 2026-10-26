import { Router } from 'express';
import { ZodError } from 'zod';
import { ComentariosController } from './comentarios.controller.js';
import { ComentariosError } from './comentarios.errors.js';

export function createComentariosRouter(comentariosService) {
  const router = Router({ mergeParams: true });
  const controller = new ComentariosController(comentariosService);

  router.get('/', controller.listar);
  router.post('/', controller.crear);

  router.use((error, request, response, next) => {
    if (error instanceof ZodError) {
      return response.status(400).json({ error: error.issues[0].message });
    }
    if (error instanceof ComentariosError) {
      return response.status(error.statusCode).json({ error: error.message });
    }
    return next(error);
  });

  return router;
}
