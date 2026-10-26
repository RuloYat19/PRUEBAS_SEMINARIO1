import { useEffect, useState, type FormEvent } from 'react'
import { TIPOS_ACEPTADOS } from './imagen'
import type { PublicacionesApi } from './publicaciones.api'
import styles from './Publicaciones.module.css'

interface Props {
  api: PublicacionesApi
  onPublicada: () => void
}

export function CrearPublicacion({ api, onPublicada }: Props) {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null)
  const [descripcion, setDescripcion] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!archivo) {
      setVistaPrevia(null)
      return
    }
    const url = URL.createObjectURL(archivo)
    setVistaPrevia(url)
    return () => URL.revokeObjectURL(url)
  }, [archivo])

  async function publicar(evento: FormEvent) {
    evento.preventDefault()
    if (!archivo) {
      setError('Elige una imagen para publicar')
      return
    }
    setEnviando(true)
    setError(null)
    try {
      await api.crear(archivo, descripcion)
      setArchivo(null)
      setDescripcion('')
      onPublicada()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo publicar')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className={styles.crear} onSubmit={publicar}>
      <h2 className={styles.titulo}>Nueva publicación</h2>

      <label className={styles.selectorImagen}>
        {vistaPrevia ? (
          <img src={vistaPrevia} alt="Vista previa" className={styles.vistaPrevia} />
        ) : (
          <span>Elegir imagen (JPG o PNG)</span>
        )}
        <input
          type="file"
          accept={TIPOS_ACEPTADOS.join(',')}
          onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
          disabled={enviando}
          hidden
        />
      </label>

      <textarea
        className={styles.descripcion}
        placeholder="Descripción (opcional)"
        maxLength={1000}
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        disabled={enviando}
      />

      {error && <p className={styles.error}>{error}</p>}

      <button type="submit" className={styles.boton} disabled={enviando || !archivo}>
        {enviando ? 'Publicando y etiquetando…' : 'Publicar'}
      </button>
    </form>
  )
}
