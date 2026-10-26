import type { ReactNode } from 'react'
import { cssVars, cx } from '@/shared/lib'
import type { Tone } from '@/shared/ui/types'
import styles from './IconBox.module.css'

export interface IconBoxProps {
  icon: ReactNode
  tone?: Tone
  size?: number
  className?: string
}

export function IconBox({ icon, tone = 'neutral', size = 40, className }: IconBoxProps) {
  return (
    <span className={cx(styles.box, styles[tone], className)} style={cssVars({ '--size': `${size}px` })}>
      {icon}
    </span>
  )
}
