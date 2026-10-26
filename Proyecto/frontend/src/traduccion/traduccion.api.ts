import { api, request } from '@/shared/api'

export const IDIOMAS = [
  { codigo: 'en', nombre: 'Inglés' },
  { codigo: 'fr', nombre: 'Francés' },
  { codigo: 'pt', nombre: 'Portugués' },
] as const

export type Idioma = (typeof IDIOMAS)[number]['codigo']

export interface Traduccion {
  texto: string
  idiomaOrigen: string
  idioma: Idioma
}

const cache = new Map<string, Promise<Traduccion>>()

export function traducir(texto: string, idioma: Idioma): Promise<Traduccion> {
  const clave = `${idioma}\u0000${texto}`
  const enCache = cache.get(clave)
  if (enCache) return enCache

  const pendiente = request<{ traduccion: Traduccion }>(api('/traducciones'), {
    method: 'POST',
    body: JSON.stringify({ texto, idioma }),
  }).then(({ traduccion }) => traduccion)

  pendiente.catch(() => cache.delete(clave))
  cache.set(clave, pendiente)
  return pendiente
}
