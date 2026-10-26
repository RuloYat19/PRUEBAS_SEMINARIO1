import { z } from 'zod';

export const preguntaSchema = z.object({
  mensaje: z.string().trim().min(1).max(1024),
  sesionId: z.string().min(1).max(100),
});
