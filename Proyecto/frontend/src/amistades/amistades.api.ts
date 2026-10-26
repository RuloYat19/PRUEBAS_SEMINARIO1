import { api, request } from '@/shared/api'

export interface UsuarioResumen {
  id: number
  nombreCompleto: string
  fotoPerfilUrl: string
}

export interface Solicitud {
  id: number
  usuario: UsuarioResumen
  fechaSolicitud: string
}

export interface Solicitudes {
  recibidas: Solicitud[]
  enviadas: Solicitud[]
}

export async function listarAmigos() {
  const { amigos } = await request<{ amigos: UsuarioResumen[] }>(api('/amistades'))
  return amigos
}

export async function listarPersonas() {
  const { usuarios } = await request<{ usuarios: UsuarioResumen[] }>(api('/amistades/personas'))
  return usuarios
}

export function listarSolicitudes() {
  return request<Solicitudes>(api('/amistades/solicitudes'))
}

export async function enviarSolicitud(receptorId: number) {
  const { solicitud } = await request<{ solicitud: Solicitud }>(api('/amistades/solicitudes'), {
    method: 'POST',
    body: JSON.stringify({ receptorId }),
  })
  return solicitud
}

export async function responderSolicitud(id: number, estado: 'ACEPTADA' | 'RECHAZADA') {
  await request(api(`/amistades/solicitudes/${id}`), { method: 'PUT', body: JSON.stringify({ estado }) })
}
