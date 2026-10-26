import type { ReactNode } from 'react'
import type { Publicacion } from './publicaciones.types'
import styles from './Publicaciones.module.css'

interface Props {
  publicacion: Publicacion
  onSeleccionarEtiqueta: (etiqueta: string) => void
  /** Espacio para comentarios y traducción (dominios de R5). */
  children?: ReactNode
}

const formatoFecha = new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short' })

export function TarjetaPublicacion({ publicacion, onSeleccionarEtiqueta, children }: Props) {
  const { autor, descripcion, imagenUrl, fechaPublicacion, etiquetas, totalComentarios } = publicacion

  return (
    <article className={styles.tarjeta}>
      <header className={styles.autor}>
        <img src={autor.fotoPerfilUrl} alt="" className={styles.avatar} />
        <div>
          <strong>{autor.nombreCompleto}</strong>
          <time dateTime={fechaPublicacion} className={styles.fecha}>
            {formatoFecha.format(new Date(fechaPublicacion))}
          </time>
        </div>
      </header>

      <img src={imagenUrl} alt={descripcion ?? 'Imagen publicada'} className={styles.imagen} />

      {descripcion && <p className={styles.texto}>{descripcion}</p>}

      {etiquetas.length > 0 && (
        <ul className={styles.etiquetas} aria-label="Etiquetas de Rekognition">
          {etiquetas.map(({ nombre, confianza }) => (
            <li key={nombre}>
              <button
                type="button"
                className={styles.etiqueta}
                title={`Confianza ${confianza.toFixed(1)} %`}
                onClick={() => onSeleccionarEtiqueta(nombre)}
              >
                #{nombre}
              </button>
            </li>
          ))}
        </ul>
      )}

      <footer className={styles.pie}>
        {totalComentarios === 1 ? '1 comentario' : `${totalComentarios} comentarios`}
      </footer>

      {children}
    </article>
  )
}
