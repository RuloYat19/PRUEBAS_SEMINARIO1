import { api, request } from '@/shared/api'

export interface DatosRegistro {
  nombreCompleto: string
  correo: string
  dpi: string
  password: string
  fotoPerfilKey: string
}

export const CORREO_SIN_VERIFICAR = 403

export async function registrar(datos: DatosRegistro) {
  await request(api('/auth/registro'), { method: 'POST', body: JSON.stringify(datos) })
}

export async function verificarCorreo(correo: string, codigo: string) {
  await request(api('/auth/verificar'), { method: 'POST', body: JSON.stringify({ correo, codigo }) })
}

export async function reenviarCodigo(correo: string) {
  await request(api('/auth/reenviar-codigo'), { method: 'POST', body: JSON.stringify({ correo }) })
}

export async function iniciarConPassword(correo: string, password: string) {
  const { token } = await request<{ token: string }>(api('/auth/login'), {
    method: 'POST',
    body: JSON.stringify({ correo, password }),
  })
  return token
}

export async function iniciarConRostro(correo: string, imagen: string) {
  const { token } = await request<{ token: string }>(api('/auth/login-facial'), {
    method: 'POST',
    body: JSON.stringify({ correo, imagen }),
  })
  return token
}
