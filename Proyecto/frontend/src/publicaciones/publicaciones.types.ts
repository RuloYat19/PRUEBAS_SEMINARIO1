/** Forma del contrato de dominios/publicaciones/README.md, sección 3. */

export interface Etiqueta {
  nombre: string
  confianza: number
}

export interface Publicacion {
  id: number
  descripcion: string | null
  imagenUrl: string
  fechaPublicacion: string
  autor: {
    id: number
    nombreCompleto: string
    fotoPerfilUrl: string
  }
  etiquetas: Etiqueta[]
  totalComentarios: number
}

export interface EtiquetaConTotal {
  nombre: string
  total: number
}

/** `request` del cliente HTTP compartido: agrega el token y lanza ApiError si falla. */
export type Request = <T>(url: string, init?: RequestInit) => Promise<T>
