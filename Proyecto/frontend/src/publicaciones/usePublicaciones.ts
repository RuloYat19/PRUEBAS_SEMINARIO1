import { useCallback, useEffect, useState } from 'react'
import type { PublicacionesApi } from './publicaciones.api'
import type { EtiquetaConTotal, Publicacion } from './publicaciones.types'

const ESPERA_BUSQUEDA_MS = 250

function mensaje(error: unknown) {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado'
}

/** Estado del feed: publicaciones, filtro seleccionado y lista de etiquetas. */
export function usePublicaciones(api: PublicacionesApi) {
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([])
  const [etiquetas, setEtiquetas] = useState<EtiquetaConTotal[]>([])
  /** `null` es el filtro *Todos*. */
  const [etiqueta, setEtiqueta] = useState<string | null>(null)
  const [buscar, setBuscar] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let vigente = true
    setCargando(true)
    api
      .listarFeed(etiqueta ?? undefined)
      .then((datos) => {
        if (!vigente) return
        setPublicaciones(datos)
        setError(null)
      })
      .catch((e) => vigente && setError(mensaje(e)))
      .finally(() => vigente && setCargando(false))
    return () => {
      vigente = false
    }
  }, [api, etiqueta, version])

  useEffect(() => {
    let vigente = true
    const espera = setTimeout(() => {
      api
        .listarEtiquetas(buscar.trim() || undefined)
        .then((datos) => vigente && setEtiquetas(datos))
        .catch((e) => vigente && setError(mensaje(e)))
    }, ESPERA_BUSQUEDA_MS)
    return () => {
      vigente = false
      clearTimeout(espera)
    }
  }, [api, buscar, version])

  /** Después de publicar se recargan el feed y los filtros (puede haber etiquetas nuevas). */
  const recargar = useCallback(() => setVersion((v) => v + 1), [])

  return {
    publicaciones,
    etiquetas,
    etiqueta,
    setEtiqueta,
    buscar,
    setBuscar,
    cargando,
    error,
    recargar,
  }
}
