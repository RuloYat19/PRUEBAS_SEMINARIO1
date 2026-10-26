import { Router } from 'express';
import { ChatbotController } from './chatbot.controller.js';
import { ChatbotError } from './chatbot.errors.js';
import { asyncHandler } from '../shared/middleware/async-handler.js';

export function createChatbotRouter(service) {
  const router = Router();
  const controller = new ChatbotController(service);
  router.post('/', asyncHandler(controller.preguntar));
  router.use((error, _request, response, next) => {
    if (error instanceof ChatbotError) return response.status(error.statusCode).json({ error: error.message });
    return next(error);
  });
  return router;
}
