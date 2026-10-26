import { IMAGENES_API_URL, request } from '@/shared/api'
import { comprimirImagen } from './comprimir'

export type Carpeta = 'Fotos_Perfil' | 'Fotos_Publicadas'

export interface ImagenSubida {
  key: string
  url: string
}

export async function subirImagen(carpeta: Carpeta, file: Blob): Promise<ImagenSubida> {
  const imagen = await comprimirImagen(file)
  return request<ImagenSubida>(IMAGENES_API_URL, {
    method: 'POST',
    body: JSON.stringify({ carpeta, imagen }),
  })
}
