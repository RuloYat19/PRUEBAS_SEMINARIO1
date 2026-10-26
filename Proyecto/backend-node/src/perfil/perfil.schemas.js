import { z } from 'zod';

const FOTO_KEY = /^Fotos_Perfil\/[A-Za-z0-9_-]+\.(jpe?g|png)$/i;

export const actualizarPerfilSchema = z.object(
  {
    nombreCompleto: z
      .string({ error: 'nombreCompleto es obligatorio' })
      .trim()
      .min(1, 'El nombre no puede estar vacío')
      .max(150, 'El nombre no puede pasar de 150 caracteres'),
    dpi: z
      .string({ error: 'dpi es obligatorio' })
      .trim()
      .regex(/^\d{13}$/, 'El DPI debe tener 13 dígitos'),
    fotoPerfilKey: z
      .string({ error: 'fotoPerfilKey debe ser texto' })
      .regex(FOTO_KEY, 'fotoPerfilKey debe ser Fotos_Perfil/<archivo>.jpg, .jpeg o .png')
      .optional(),
    password: z.string({ error: 'password es obligatorio' }).min(1, 'password es obligatorio'),
  },
  { error: 'El cuerpo debe ser un objeto JSON' },
);
