import type { ReactNode } from 'react'
import { cx } from '@/shared/lib'
import styles from './MessageBubble.module.css'

export interface MessageBubbleProps {
  propio: boolean
  children: ReactNode
  meta?: ReactNode
}

export function MessageBubble({ propio, children, meta }: MessageBubbleProps) {
  return (
    <div className={cx(styles.fila, propio && styles.propio)}>
      <div className={styles.burbuja}>
        <div className={styles.texto}>{children}</div>
        {meta ? <span className={styles.meta}>{meta}</span> : null}
      </div>
    </div>
  )
}
