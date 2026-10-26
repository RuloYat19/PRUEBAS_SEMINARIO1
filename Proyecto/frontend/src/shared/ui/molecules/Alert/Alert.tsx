import type { ReactNode } from 'react'
import { AlertIcon, CheckCircleIcon, CloseIcon, IconButton, InfoIcon, type IconComponent } from '@/shared/ui/atoms'
import { cx } from '@/shared/lib'
import type { Tone } from '@/shared/ui/types'
import styles from './Alert.module.css'

const TONE_ICON: Record<Tone, IconComponent> = {
  neutral: InfoIcon,
  accent: InfoIcon,
  sky: InfoIcon,
  success: CheckCircleIcon,
  warning: AlertIcon,
  danger: AlertIcon,
}

export interface AlertProps {
  tone?: Tone
  title?: string
  children?: ReactNode
  elevated?: boolean
  onDismiss?: () => void
  className?: string
}

export function Alert({ tone = 'neutral', title, children, elevated = false, onDismiss, className }: AlertProps) {
  const Icon = TONE_ICON[tone]

  return (
    <div
      className={cx(styles.alert, styles[tone], elevated && styles.elevated, className)}
      role={tone === 'danger' ? 'alert' : 'status'}
    >
      <span className={styles.icon}>
        <Icon size={18} />
      </span>
      <div className={styles.body}>
        {title ? <p className={styles.title}>{title}</p> : null}
        {children ? <div className={styles.text}>{children}</div> : null}
      </div>
      {onDismiss ? (
        <IconButton className={styles.close} size="sm" icon={<CloseIcon size={16} />} label="Cerrar" onClick={onDismiss} />
      ) : null}
    </div>
  )
}
