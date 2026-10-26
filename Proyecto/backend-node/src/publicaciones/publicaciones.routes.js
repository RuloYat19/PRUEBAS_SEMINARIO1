import { Router } from 'express';
import { ZodError } from 'zod';
import { PublicacionesController } from './publicaciones.controller.js';
import { PublicacionesError } from './publicaciones.errors.js';

// Se monta en /publicaciones, DESPUÉS del middleware que valida el token:
//   app.use('/publicaciones', requireAuth, createPublicacionesRouter(service));
export function createPublicacionesRouter(publicacionesService) {
  const router = Router();
  const controller = new PublicacionesController(publicacionesService);

  router.post('/', controller.crear);
  router.get('/', controller.listarFeed);
  router.get('/etiquetas', controller.listarEtiquetas);
  router.get('/:id', controller.buscar);

  // Traduce los errores de este módulo al formato del contrato. Lo que no
  // reconoce lo deja pasar al manejador de errores general de la app.
  router.use((error, request, response, next) => {
    if (error instanceof ZodError) {
      return response.status(400).json({ error: error.issues[0].message });
    }
    if (error instanceof PublicacionesError) {
      return response.status(error.statusCode).json({ error: error.message });
    }
    return next(error);
  });

  return router;
}
