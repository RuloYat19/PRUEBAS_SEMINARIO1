import { z } from 'zod';

const FOTO_KEY = /^Fotos_Perfil\/[A-Za-z0-9_-]+\.(jpe?g|png)$/i;
const email = z.string().trim().toLowerCase().email('correo debe ser un correo válido').max(150);

export const registroSchema = z.object({
  nombreCompleto: z.string().trim().min(1, 'El nombre no puede estar vacío').max(150),
  correo: email,
  dpi: z.string().trim().regex(/^\d{13}$/, 'El DPI debe tener 13 dígitos'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[a-z]/, 'La contraseña debe incluir una minúscula')
    .regex(/[A-Z]/, 'La contraseña debe incluir una mayúscula')
    .regex(/\d/, 'La contraseña debe incluir un número')
    .regex(/[^A-Za-z0-9]/, 'La contraseña debe incluir un símbolo'),
  fotoPerfilKey: z.string().regex(FOTO_KEY, 'fotoPerfilKey debe ser una key de Fotos_Perfil'),
});

export const verificarSchema = z.object({ correo: email, codigo: z.string().trim().length(6) });
export const correoSchema = z.object({ correo: email });
export const loginSchema = z.object({ correo: email, password: z.string().min(1) });
export const loginFacialSchema = z.object({
  correo: email,
  imagen: z.string().regex(/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/]+=*$/, 'imagen debe ser JPEG o PNG en base64'),
});
