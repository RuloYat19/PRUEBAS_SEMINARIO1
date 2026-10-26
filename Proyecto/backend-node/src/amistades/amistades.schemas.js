import { z } from 'zod';

export const enviarSolicitudSchema = z.object({
  receptorId: z.coerce.number().int().positive('receptorId debe ser un entero positivo'),
});

export const responderSolicitudSchema = z.object({
  id: z.coerce.number().int().positive('id debe ser un entero positivo'),
  estado: z.enum(['ACEPTADA', 'RECHAZADA'], { error: 'estado debe ser ACEPTADA o RECHAZADA' }),
});
