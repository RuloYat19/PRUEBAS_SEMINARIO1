import { api, request } from '@/shared/api'

export interface Comentario {
  id: number
  texto: string
  fechaComentario: string
  autor: {
    id: number
    nombreCompleto: string
    fotoPerfilUrl: string
  }
}

const ruta = (publicacionId: number) => api(`/publicaciones/${publicacionId}/comentarios`)

export async function listarComentarios(publicacionId: number) {
  const { comentarios } = await request<{ comentarios: Comentario[] }>(ruta(publicacionId))
  return comentarios
}

export async function crearComentario(publicacionId: number, texto: string) {
  const { comentario } = await request<{ comentario: Comentario }>(ruta(publicacionId), {
    method: 'POST',
    body: JSON.stringify({ texto }),
  })
  return comentario
}
