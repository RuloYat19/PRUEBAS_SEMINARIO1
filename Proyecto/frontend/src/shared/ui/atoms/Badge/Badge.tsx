import type { ReactNode } from 'react'
import { cx } from '@/shared/lib'
import type { Tone } from '@/shared/ui/types'
import styles from './Badge.module.css'

export type BadgeTone = Tone

export interface BadgeProps {
  tone?: BadgeTone
  icon?: ReactNode
  dot?: boolean
  className?: string
  children: ReactNode
}

export function Badge({ tone = 'neutral', icon, dot = false, className, children }: BadgeProps) {
  return (
    <span className={cx(styles.badge, styles[tone], dot && styles.dot, className)}>
      {icon}
      {children}
    </span>
  )
}
