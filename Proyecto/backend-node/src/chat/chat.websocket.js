import { WebSocketServer, WebSocket } from 'ws';
import { mensajeSchema } from './chat.schemas.js';

const enviarEvento = (socket, evento) => {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(evento));
};

export function attachChatWebSocket(server, { chat, authenticate, pollIntervalMs = 500, allowedOrigins = [] }) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });
  const conexiones = new Map();
  let cursor = 0;
  let polling = false;
  let closed = false;

  const initialized = (chat.repository?.ultimoId?.() ?? Promise.resolve(0))
    .then((id) => { cursor = id; })
    .catch((error) => console.error('[chat] No se pudo inicializar el relevo:', error));

  server.on('upgrade', (request, socket, head) => {
    void (async () => {
      const url = new URL(request.url, 'http://localhost');
      if (url.pathname !== '/chat') return socket.destroy();
      const origin = request.headers.origin;
      if (origin && allowedOrigins.length && !allowedOrigins.includes(origin)) return socket.destroy();
      const usuario = await authenticate(url.searchParams.get('token'));
      if (!usuario) return socket.destroy();
      wss.handleUpgrade(request, socket, head, (webSocket) => {
        webSocket.usuarioId = usuario.id;
        wss.emit('connection', webSocket, request);
      });
    })().catch(() => socket.destroy());
  });

  wss.on('connection', (socket) => {
    socket.alive = true;
    const sockets = conexiones.get(socket.usuarioId) ?? new Set();
    sockets.add(socket);
    conexiones.set(socket.usuarioId, sockets);
    socket.on('message', async (raw) => {
      try {
        const data = mensajeSchema.parse(JSON.parse(raw.toString()));
        await chat.enviar(socket.usuarioId, data.receptorId, data.texto);
        // El emisor recibe el mismo evento que el destinatario mediante el relevo RDS.
      } catch (error) {
        enviarEvento(socket, { tipo: 'error', error: error.message || 'No se pudo enviar el mensaje' });
      }
    });
    socket.on('pong', () => { socket.alive = true; });
    socket.on('error', (error) => console.error('[chat] Error de WebSocket:', error));
    socket.on('close', () => {
      sockets.delete(socket);
      if (!sockets.size) conexiones.delete(socket.usuarioId);
    });
  });

  const timer = setInterval(async () => {
    if (polling || closed) return;
    polling = true;
    try {
      await initialized;
      const messages = await chat.repository.mensajesNuevos(cursor);
      for (const mensaje of messages) {
        cursor = Math.max(cursor, mensaje.id);
        for (const id of [mensaje.emisorId, mensaje.receptorId]) {
          for (const socket of conexiones.get(id) ?? []) {
            enviarEvento(socket, { tipo: 'mensaje', mensaje });
          }
        }
      }
    } catch (error) {
      console.error('[chat] Falló el relevo de mensajes:', error);
    } finally {
      polling = false;
    }
  }, pollIntervalMs);

  const heartbeat = setInterval(() => {
    for (const socket of wss.clients) {
      if (!socket.alive) {
        socket.terminate();
        continue;
      }
      socket.alive = false;
      socket.ping();
    }
  }, 25_000);

  return () => {
    closed = true;
    clearInterval(timer);
    clearInterval(heartbeat);
    for (const sockets of conexiones.values()) for (const socket of sockets) socket.close();
    wss.close();
  };
}
