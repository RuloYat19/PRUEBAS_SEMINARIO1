export class AmistadesError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'AmistadesError';
    this.statusCode = statusCode;
  }
}

export const erroresAmistades = {
  noAutenticado: () => new AmistadesError(401, 'No autenticado'),
  noEncontrado: () => new AmistadesError(404, 'Solicitud no encontrada'),
  conflicto: (message = 'No se puede enviar esta solicitud') => new AmistadesError(409, message),
};
