import type { ElementType, HTMLAttributes } from 'react'
import { cx } from '@/shared/lib'
import styles from './Surface.module.css'

export interface SurfaceProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType
  interactive?: boolean
  type?: 'button' | 'submit'
}

export function Surface({ as: Component = 'div', interactive = false, className, ...rest }: SurfaceProps) {
  return <Component className={cx(styles.surface, interactive && styles.interactive, className)} {...rest} />
}
