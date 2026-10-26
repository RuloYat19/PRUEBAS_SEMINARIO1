import { createServer } from 'node:http';
import { createApp } from './app.js';
import { createContainer } from './container.js';
import { attachChatWebSocket } from './chat/chat.websocket.js';

const container = createContainer();
const app = createApp({
  services: container.services,
  requireAuth: container.requireAuth,
  corsOrigins: container.config.corsOrigins,
});
const server = createServer(app);
const stopChatRelay = attachChatWebSocket(server, {
  chat: container.services.chat,
  authenticate: container.requireAuth.authenticateToken,
  pollIntervalMs: 500,
  allowedOrigins: container.config.corsOrigins,
});

server.listen(container.config.PORT, '0.0.0.0', () => {
  console.log(`[backend-node] escuchando en 0.0.0.0:${container.config.PORT}`);
});

async function shutdown(signal) {
  console.log(`[backend-node] cerrando por ${signal}`);
  stopChatRelay();
  server.close(async () => {
    await container.close();
    process.exit(0);
  });
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
