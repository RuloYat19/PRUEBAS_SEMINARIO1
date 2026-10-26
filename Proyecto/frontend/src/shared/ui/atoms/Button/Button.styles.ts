import { cx } from '@/shared/lib'
import type { ControlSize } from '@/shared/ui/types'
import styles from './Button.module.css'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

export interface ButtonStyleProps {
  variant?: ButtonVariant
  size?: ControlSize
  fullWidth?: boolean
  iconOnly?: boolean
}

export function buttonClass(
  { variant = 'primary', size = 'md', fullWidth = false, iconOnly = false }: ButtonStyleProps,
  ...extra: Array<string | false | undefined>
) {
  return cx(
    styles.button,
    styles[variant],
    size !== 'md' && styles[size],
    fullWidth && styles.fullWidth,
    iconOnly && styles.iconOnly,
    ...extra,
  )
}

export { styles as buttonStyles }
