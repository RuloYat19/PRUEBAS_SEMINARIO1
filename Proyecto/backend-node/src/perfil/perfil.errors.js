export class PerfilError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'PerfilError';
    this.statusCode = statusCode;
  }
}

export const errores = {
  validacion: (message) => new PerfilError(400, message),
  noAutenticado: () => new PerfilError(401, 'No autenticado'),
  passwordIncorrecta: () => new PerfilError(403, 'La contraseña no es correcta'),
  noEncontrado: () => new PerfilError(404, 'Usuario no encontrado'),
  dpiEnUso: () => new PerfilError(409, 'Ese DPI ya está registrado'),
  cognito: () => new PerfilError(502, 'No se pudo actualizar el perfil en Cognito'),
};
