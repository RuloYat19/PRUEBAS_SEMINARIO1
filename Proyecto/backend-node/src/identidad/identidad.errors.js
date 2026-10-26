export class IdentidadError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'IdentidadError';
    this.statusCode = statusCode;
  }
}

export const erroresIdentidad = {
  correoNoVerificado: () => new IdentidadError(403, 'Correo sin verificar'),
  credenciales: () => new IdentidadError(401, 'Correo o contraseña incorrectos'),
  rostroNoCoincide: () => new IdentidadError(401, 'No se pudo verificar el rostro'),
  correoEnUso: () => new IdentidadError(409, 'El correo ya está registrado'),
  dpiEnUso: () => new IdentidadError(409, 'El DPI ya está registrado'),
  datosInvalidos: (message) => new IdentidadError(400, message),
  cognito: () => new IdentidadError(502, 'No se pudo completar la operación de identidad'),
};
