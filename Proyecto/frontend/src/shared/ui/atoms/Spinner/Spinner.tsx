import { cssVars } from '@/shared/lib'
import styles from './Spinner.module.css'

interface SpinnerProps {
  size?: number
  label?: string
}

export function Spinner({ size = 18, label = 'Cargando' }: SpinnerProps) {
  return (
    <span
      className={styles.spinner}
      style={cssVars({ '--size': `${size}px` })}
      role="status"
      aria-label={label}
    />
  )
}
