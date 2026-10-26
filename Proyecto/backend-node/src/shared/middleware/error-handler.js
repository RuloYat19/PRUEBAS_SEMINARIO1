import { ZodError } from 'zod';

export function errorHandler(error, _request, response, _next) {
  if (response.headersSent) return;
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    response.status(400).json({ error: 'El cuerpo debe ser JSON válido' });
    return;
  }
  if (error instanceof ZodError) {
    response.status(400).json({ error: error.issues[0]?.message ?? 'Solicitud inválida' });
    return;
  }
  if (Number.isInteger(error.statusCode)) {
    response.status(error.statusCode).json({ error: error.message });
    return;
  }
  console.error('[backend] Error no controlado:', error);
  response.status(500).json({ error: 'Error interno del servidor' });
}
