import type { ReactNode } from 'react'
import { Avatar } from '@/shared/ui/atoms'
import styles from './UserRow.module.css'

export interface UserRowProps {
  nombre: string
  fotoUrl?: string | null
  detalle?: ReactNode
  acciones?: ReactNode
}

export function UserRow({ nombre, fotoUrl, detalle, acciones }: UserRowProps) {
  return (
    <div className={styles.fila}>
      <Avatar name={nombre} src={fotoUrl} size={44} />
      <div className={styles.texto}>
        <span className={styles.nombre}>{nombre}</span>
        {detalle ? <span className={styles.detalle}>{detalle}</span> : null}
      </div>
      {acciones ? <div className={styles.acciones}>{acciones}</div> : null}
    </div>
  )
}
