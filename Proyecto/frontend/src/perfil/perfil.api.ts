import { api, request } from '@/shared/api'

export interface Perfil {
  id: number
  nombreCompleto: string
  correo: string
  dpi: string
  fotoPerfilUrl: string
}

export interface CambiosPerfil {
  nombreCompleto: string
  dpi: string
  fotoPerfilKey?: string
  password: string
}

export async function obtenerPerfil() {
  const { perfil } = await request<{ perfil: Perfil }>(api('/perfil'))
  return perfil
}

export async function actualizarPerfil(cambios: CambiosPerfil) {
  const { perfil } = await request<{ perfil: Perfil }>(api('/perfil'), {
    method: 'PUT',
    body: JSON.stringify(cambios),
  })
  return perfil
}
