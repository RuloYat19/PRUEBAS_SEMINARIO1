import { api, request } from '@/shared/api'

const sesionId = crypto.randomUUID()

export async function preguntar(mensaje: string) {
  const { respuestas } = await request<{ respuestas: string[] }>(api('/chatbot'), {
    method: 'POST',
    body: JSON.stringify({ mensaje, sesionId }),
  })
  return respuestas
}
