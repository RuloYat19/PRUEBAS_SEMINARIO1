import type { FormEvent, ReactNode } from 'react'
import { Button } from '@/shared/ui/atoms'
import { Alert } from '@/shared/ui/molecules'
import styles from './AuthCard.module.css'

export interface AuthCardProps {
  overline: string
  title: ReactNode
  description: string
  onSubmit: (event: FormEvent) => void
  submitLabel: string
  submitting: boolean
  error: ReactNode
  footer: ReactNode
  hideSubmit?: boolean
  children: ReactNode
}

export function AuthCard({
  overline,
  title,
  description,
  onSubmit,
  submitLabel,
  submitting,
  error,
  footer,
  hideSubmit = false,
  children,
}: AuthCardProps) {
  return (
    <div className={styles.card}>
      <header className={styles.head}>
        <p className="tf-overline">{overline}</p>
        <h1 className="tf-h1">{title}</h1>
        <p className="tf-small">{description}</p>
      </header>

      <form className={styles.form} onSubmit={onSubmit} noValidate>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        {children}
        {hideSubmit ? null : (
          <Button type="submit" size="lg" fullWidth loading={submitting} className={styles.submit}>
            {submitLabel}
          </Button>
        )}
      </form>

      <p className={styles.footer}>{footer}</p>
    </div>
  )
}
