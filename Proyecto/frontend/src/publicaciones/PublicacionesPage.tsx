import type { ReactNode } from 'react'
import { CrearPublicacion } from './CrearPublicacion'
import { FiltroEtiquetas } from './FiltroEtiquetas'
import { TarjetaPublicacion } from './TarjetaPublicacion'
import type { PublicacionesApi } from './publicaciones.api'
import type { Publicacion } from './publicaciones.types'
import { usePublicaciones } from './usePublicaciones'
import styles from './Publicaciones.module.css'

interface Props {
  /** Crear con `createPublicacionesApi` una sola vez (fuera del render o con useMemo). */
  api: PublicacionesApi
  /** Lo que va debajo de cada publicación: comentarios y botón de traducir (R5). */
  renderExtras?: (publicacion: Publicacion) => ReactNode
}

/** Página principal: crear publicación, filtros por etiqueta y feed. */
export function PublicacionesPage({ api, renderExtras }: Props) {
  const feed = usePublicaciones(api)

  return (
    <div className={styles.pagina}>
      <CrearPublicacion api={api} onPublicada={feed.recargar} />

      <FiltroEtiquetas
        etiquetas={feed.etiquetas}
        seleccionada={feed.etiqueta}
        onSeleccionar={feed.setEtiqueta}
        buscar={feed.buscar}
        onBuscar={feed.setBuscar}
      />

      {feed.error && <p className={styles.error}>{feed.error}</p>}

      {feed.cargando && feed.publicaciones.length === 0 ? (
        <p className={styles.vacio}>Cargando publicaciones…</p>
      ) : feed.publicaciones.length === 0 ? (
        <p className={styles.vacio}>
          {feed.etiqueta
            ? `No hay publicaciones con la etiqueta ${feed.etiqueta}`
            : 'Aún no hay publicaciones. ¡Sé el primero en publicar!'}
        </p>
      ) : (
        <div className={styles.feed} aria-busy={feed.cargando}>
          {feed.publicaciones.map((publicacion) => (
            <TarjetaPublicacion
              key={publicacion.id}
              publicacion={publicacion}
              onSeleccionarEtiqueta={feed.setEtiqueta}
            >
              {renderExtras?.(publicacion)}
            </TarjetaPublicacion>
          ))}
        </div>
      )}
    </div>
  )
}
