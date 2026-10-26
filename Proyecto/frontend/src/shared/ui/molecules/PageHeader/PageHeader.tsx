import type { ReactNode } from 'react'
import styles from './PageHeader.module.css'

export interface PageHeaderProps {
  overline?: string
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}

export function PageHeader({ overline, title, description, actions }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.text}>
        {overline ? <p className="tf-overline">{overline}</p> : null}
        <h1 className="tf-h1">{title}</h1>
        {description ? <p className="tf-small">{description}</p> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  )
}
