export class ChatError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'ChatError';
    this.statusCode = statusCode;
  }
}

export const erroresChat = {
  noAutenticado: () => new ChatError(401, 'No autenticado'),
  noAmigo: () => new ChatError(403, 'Solo puedes chatear con tus amigos'),
  mensajeInvalido: () => new ChatError(400, 'El mensaje debe tener entre 1 y 2000 caracteres'),
};
