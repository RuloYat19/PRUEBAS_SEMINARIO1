import { z } from 'zod';

export const amigoIdSchema = z.coerce.number().int().positive();
export const mensajeSchema = z.object({
  tipo: z.literal('mensaje'),
  receptorId: z.coerce.number().int().positive(),
  texto: z.string().trim().min(1).max(2000),
});
