import express from 'express';
import { createCorsMiddleware } from './shared/middleware/cors.js';
import { errorHandler } from './shared/middleware/error-handler.js';
import { createIdentidadRouter } from './identidad/identidad.routes.js';
import { createAmistadesRouter } from './amistades/amistades.routes.js';
import { createPublicacionesRouter } from './publicaciones/publicaciones.routes.js';
import { createComentariosRouter } from './comentarios/comentarios.routes.js';
import { createPerfilRouter } from './perfil/perfil.routes.js';
import { createTraduccionRouter } from './traduccion/traduccion.routes.js';
import { createChatRouter } from './chat/chat.routes.js';
import { createChatbotRouter } from './chatbot/chatbot.routes.js';

export function createApp({ services, requireAuth, corsOrigins = [] }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(createCorsMiddleware(corsOrigins));
  // Una imagen facial JPEG de 4 MB en base64 ocupa menos de 5.4 MB.
  app.use(express.json({ limit: '6mb' }));

  app.get('/health', (_request, response) => {
    response.status(200).json({ status: 'ok', backend: 'node' });
  });

  app.use('/auth', createIdentidadRouter(services.identidad));
  app.use('/amistades', requireAuth, createAmistadesRouter(services.amistades));
  app.use('/publicaciones/:publicacionId/comentarios', requireAuth, createComentariosRouter(services.comentarios));
  app.use('/publicaciones', requireAuth, createPublicacionesRouter(services.publicaciones));
  app.use('/perfil', requireAuth, createPerfilRouter(services.perfil));
  app.use('/traducciones', requireAuth, createTraduccionRouter(services.traduccion));
  app.use('/chat', requireAuth, createChatRouter(services.chat));
  app.use('/chatbot', requireAuth, createChatbotRouter(services.chatbot));

  app.use((_request, response) => response.status(404).json({ error: 'Ruta no encontrada' }));
  app.use(errorHandler);
  return app;
}
