import type { ReactNode } from 'react'
import { IconBox } from '@/shared/ui/atoms'
import type { Tone } from '@/shared/ui/types'
import styles from './EmptyState.module.css'

export interface EmptyStateProps {
  icon: ReactNode
  tone?: Tone
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, tone = 'accent', title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      <IconBox icon={icon} tone={tone} size={52} />
      <h3 className="tf-h2">{title}</h3>
      {description ? <p className={styles.text}>{description}</p> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  )
}
