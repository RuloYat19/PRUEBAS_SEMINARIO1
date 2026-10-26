import { useState } from 'react'
import { messageFor } from '@/shared/api'
import { GlobeIcon, Spinner } from '@/shared/ui/atoms'
import { IDIOMAS, traducir, type Idioma, type Traduccion } from './traduccion.api'
import styles from './Traductor.module.css'

const NOMBRE_ORIGEN: Record<string, string> = { es: 'español', en: 'inglés', fr: 'francés', pt: 'portugués' }

type Estado =
  | { tipo: 'original' }
  | { tipo: 'cargando'; idioma: Idioma }
  | { tipo: 'listo'; traduccion: Traduccion }
  | { tipo: 'error'; idioma: Idioma; mensaje: string }

interface Props {
  texto: string
  etiqueta: string
}

export function Traductor({ texto, etiqueta }: Props) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'original' })
  const activo = estado.tipo === 'original' ? null : estado.tipo === 'listo' ? estado.traduccion.idioma : estado.idioma

  async function elegir(idioma: Idioma) {
    if (activo === idioma) return setEstado({ tipo: 'original' })
    setEstado({ tipo: 'cargando', idioma })
    try {
      setEstado({ tipo: 'listo', traduccion: await traducir(texto, idioma) })
    } catch (error) {
      setEstado({ tipo: 'error', idioma, mensaje: messageFor(error, 'No se pudo traducir.') })
    }
  }

  return (
    <div className={styles.traductor}>
      <div className={styles.idiomas} role="group" aria-label={`Traducir ${etiqueta}`}>
        <GlobeIcon size={14} aria-hidden="true" />
        {IDIOMAS.map(({ codigo, nombre }) => (
          <button
            key={codigo}
            type="button"
            className={styles.idioma}
            aria-pressed={activo === codigo}
            title={`Traducir al ${nombre.toLowerCase()}`}
            onClick={() => elegir(codigo)}
          >
            {codigo.toUpperCase()}
          </button>
        ))}
        {estado.tipo === 'cargando' ? <Spinner size={12} label="Traduciendo" /> : null}
      </div>

      {estado.tipo === 'listo' ? (
        <div className={styles.resultado} lang={estado.traduccion.idioma}>
          <p>{estado.traduccion.texto}</p>
          <span className={styles.origen}>
            Traducido del {NOMBRE_ORIGEN[estado.traduccion.idiomaOrigen] ?? estado.traduccion.idiomaOrigen} ·{' '}
            <button type="button" className={styles.original} onClick={() => setEstado({ tipo: 'original' })}>
              ver original
            </button>
          </span>
        </div>
      ) : null}

      {estado.tipo === 'error' ? (
        <p className={styles.error} role="alert">
          {estado.mensaje}
        </p>
      ) : null}
    </div>
  )
}
