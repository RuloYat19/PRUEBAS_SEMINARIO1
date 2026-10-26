export class TraduccionError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'TraduccionError';
    this.statusCode = statusCode;
  }
}

export const errores = {
  noAutenticado: () => new TraduccionError(401, 'No autenticado'),
  translate: () => new TraduccionError(502, 'No se pudo traducir el texto'),
};
