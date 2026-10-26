export class PublicacionesError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'PublicacionesError';
    this.statusCode = statusCode;
  }
}

export const errores = {
  validacion: (message) => new PublicacionesError(400, message),
  noAutenticado: () => new PublicacionesError(401, 'No autenticado'),
  noEncontrada: () => new PublicacionesError(404, 'Publicación no encontrada'),
  rekognition: () =>
    new PublicacionesError(502, 'No se pudieron obtener las etiquetas de la imagen'),
};
