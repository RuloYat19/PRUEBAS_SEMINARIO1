import { comprimirImagen } from './imagen'
import type { EtiquetaConTotal, Publicacion, Request } from './publicaciones.types'

export interface PublicacionesApiConfig {
  /** Cliente HTTP compartido (agrega el token de Cognito). */
  request: Request
  /** DNS del ALB, sin barra final. */
  apiUrl: string
  /** URL de API Gateway de imágenes, sin barra final (ver dominios/imagenes). */
  imagenesApiUrl: string
}

export type PublicacionesApi = ReturnType<typeof createPublicacionesApi>

function conQuery(url: string, nombre: string, valor?: string) {
  return valor ? `${url}?${nombre}=${encodeURIComponent(valor)}` : url
}

export function createPublicacionesApi({ request, apiUrl, imagenesApiUrl }: PublicacionesApiConfig) {
  return {
    async listarFeed(etiqueta?: string) {
      const url = conQuery(`${apiUrl}/publicaciones`, 'etiqueta', etiqueta)
      const { publicaciones } = await request<{ publicaciones: Publicacion[] }>(url)
      return publicaciones
    },

    async listarEtiquetas(buscar?: string) {
      const url = conQuery(`${apiUrl}/publicaciones/etiquetas`, 'buscar', buscar)
      const { etiquetas } = await request<{ etiquetas: EtiquetaConTotal[] }>(url)
      return etiquetas
    },

    /** Sube la imagen por API Gateway y luego registra la publicación en el backend. */
    async crear(file: File, descripcion: string) {
      const imagen = await comprimirImagen(file)
      const { key } = await request<{ key: string; url: string }>(`${imagenesApiUrl}/imagenes`, {
        method: 'POST',
        body: JSON.stringify({ carpeta: 'Fotos_Publicadas', imagen }),
      })

      const { publicacion } = await request<{ publicacion: Publicacion }>(
        `${apiUrl}/publicaciones`,
        {
          method: 'POST',
          body: JSON.stringify({ imagenKey: key, descripcion }),
        },
      )
      return publicacion
    },
  }
}
