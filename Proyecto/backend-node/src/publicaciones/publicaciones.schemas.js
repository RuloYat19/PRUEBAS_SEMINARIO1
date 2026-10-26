import { z } from 'zod';

// La Lambda de imágenes nombra cada objeto `<carpeta>/<uuid>.<ext>`.
const IMAGEN_KEY = /^Fotos_Publicadas\/[A-Za-z0-9_-]+\.(jpe?g|png)$/i;

export const crearPublicacionSchema = z.object(
  {
  imagenKey: z
    .string({ error: 'imagenKey es obligatorio' })
    .regex(IMAGEN_KEY, 'imagenKey debe ser Fotos_Publicadas/<archivo>.jpg, .jpeg o .png'),
  descripcion: z
    .string({ error: 'descripcion debe ser texto' })
    .trim()
    .max(1000, 'descripcion no puede pasar de 1000 caracteres')
    .nullish()
    .transform((texto) => texto || null),
  },
  { error: 'El cuerpo debe ser un objeto JSON' },
);

export const feedQuerySchema = z.object({
  etiqueta: z.string().trim().min(1).max(100).optional().catch(undefined),
});

export const etiquetasQuerySchema = z.object({
  buscar: z.string().trim().min(1).max(100).optional().catch(undefined),
});

export const publicacionIdParamsSchema = z.object({
  id: z.coerce
    .number({ error: 'id debe ser un entero positivo' })
    .int('id debe ser un entero positivo')
    .positive('id debe ser un entero positivo'),
});
