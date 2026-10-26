import { z } from 'zod';

export const IDIOMAS = ['en', 'fr', 'pt'];

export const traducirSchema = z.object(
  {
    texto: z
      .string({ error: 'texto es obligatorio' })
      .trim()
      .min(1, 'El texto no puede estar vacío')
      .max(5000, 'El texto no puede pasar de 5000 caracteres'),
    idioma: z.enum(IDIOMAS, { error: 'idioma debe ser en, fr o pt' }),
  },
  { error: 'El cuerpo debe ser un objeto JSON' },
);
