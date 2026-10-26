export class ComentariosError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'ComentariosError';
    this.statusCode = statusCode;
  }
}

export const errores = {
  validacion: (message) => new ComentariosError(400, message),
  noAutenticado: () => new ComentariosError(401, 'No autenticado'),
  publicacionNoEncontrada: () => new ComentariosError(404, 'Publicación no encontrada'),
};
