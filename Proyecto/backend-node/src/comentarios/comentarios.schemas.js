import { z } from 'zod';

export const crearComentarioSchema = z.object(
  {
    texto: z
      .string({ error: 'texto es obligatorio' })
      .trim()
      .min(1, 'El comentario no puede estar vacío')
      .max(1000, 'El comentario no puede pasar de 1000 caracteres'),
  },
  { error: 'El cuerpo debe ser un objeto JSON' },
);

export const publicacionIdParamsSchema = z.object({
  publicacionId: z.coerce
    .number({ error: 'id debe ser un entero positivo' })
    .int('id debe ser un entero positivo')
    .positive('id debe ser un entero positivo'),
});
