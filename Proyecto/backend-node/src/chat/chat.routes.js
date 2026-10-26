import { Router } from 'express';
import { ChatController } from './chat.controller.js';
import { ChatError } from './chat.errors.js';
import { asyncHandler } from '../shared/middleware/async-handler.js';

export function createChatRouter(service) {
  const router = Router();
  const controller = new ChatController(service);
  router.get('/:amigoId/mensajes', asyncHandler(controller.historial));
  router.use((error, _request, response, next) => {
    if (error instanceof ChatError) return response.status(error.statusCode).json({ error: error.message });
    return next(error);
  });
  return router;
}
