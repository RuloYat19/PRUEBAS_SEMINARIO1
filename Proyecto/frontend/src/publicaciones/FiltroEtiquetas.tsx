import type { EtiquetaConTotal } from './publicaciones.types'
import styles from './Publicaciones.module.css'

interface Props {
  etiquetas: EtiquetaConTotal[]
  /** `null` es *Todos*. */
  seleccionada: string | null
  onSeleccionar: (etiqueta: string | null) => void
  buscar: string
  onBuscar: (texto: string) => void
}

export function FiltroEtiquetas({ etiquetas, seleccionada, onSeleccionar, buscar, onBuscar }: Props) {
  return (
    <section className={styles.filtros} aria-label="Filtrar por etiqueta">
      <input
        type="search"
        className={styles.buscador}
        placeholder="Buscar etiqueta…"
        value={buscar}
        onChange={(e) => onBuscar(e.target.value)}
      />

      <div className={styles.chips}>
        {/* *Todos* siempre visible, aunque la búsqueda no coincida con nada. */}
        <button
          type="button"
          className={styles.chip}
          aria-pressed={seleccionada === null}
          onClick={() => onSeleccionar(null)}
        >
          Todos
        </button>

        {etiquetas.map(({ nombre, total }) => (
          <button
            key={nombre}
            type="button"
            className={styles.chip}
            aria-pressed={seleccionada === nombre}
            onClick={() => onSeleccionar(nombre)}
          >
            {nombre} <span className={styles.total}>{total}</span>
          </button>
        ))}

        {buscar.trim() && etiquetas.length === 0 && (
          <span className={styles.vacio}>Ninguna etiqueta coincide con “{buscar.trim()}”</span>
        )}
      </div>
    </section>
  )
}
