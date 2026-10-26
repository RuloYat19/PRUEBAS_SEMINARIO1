import { api, request, WS_URL } from '@/shared/api'

export interface Mensaje {
  id: number
  emisorId: number
  receptorId: number
  texto: string
  fechaEnvio: string
}

export type EventoChat = { tipo: 'mensaje'; mensaje: Mensaje } | { tipo: 'error'; error: string } | { tipo: 'keepalive' }

export async function listarMensajes(amigoId: number) {
  const { mensajes } = await request<{ mensajes: Mensaje[] }>(api(`/chat/${amigoId}/mensajes`))
  return mensajes
}

export async function crearTicketSocket() {
  const { ticket } = await request<{ ticket: string }>(api('/chat/ticket'), { method: 'POST' })
  return ticket
}

export function urlSocket(ticket: string) {
  return `${WS_URL}/chat?ticket=${encodeURIComponent(ticket)}`
}
