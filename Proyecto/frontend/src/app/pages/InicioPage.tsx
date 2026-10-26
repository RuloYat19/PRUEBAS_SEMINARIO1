import { useMemo } from 'react'
import { Comentarios } from '@/comentarios'
import { createPublicacionesApi, PublicacionesPage, type Publicacion } from '@/publicaciones'
import { API_URL, IMAGENES_API_URL, request } from '@/shared/api'
import { Traductor } from '@/traduccion'
import styles from './InicioPage.module.css'

function ExtrasPublicacion({ publicacion }: { publicacion: Publicacion }) {
  return (
    <div className={styles.extras}>
      {publicacion.descripcion ? <Traductor texto={publicacion.descripcion} etiqueta="descripción" /> : null}
      <Comentarios publicacionId={publicacion.id} />
    </div>
  )
}

export function InicioPage() {
  const api = useMemo(
    () =>
      createPublicacionesApi({
        request,
        apiUrl: API_URL,
        imagenesApiUrl: IMAGENES_API_URL.replace(/\/imagenes$/, ''),
      }),
    [],
  )

  return <PublicacionesPage api={api} renderExtras={(publicacion) => <ExtrasPublicacion publicacion={publicacion} />} />
}
