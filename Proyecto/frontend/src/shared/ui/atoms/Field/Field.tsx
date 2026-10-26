import { useId, type ReactNode } from 'react'
import { cx } from '@/shared/lib'
import { AlertIcon } from '../Icon'
import styles from './Field.module.css'

export interface FieldControlProps {
  id: string
  'aria-invalid'?: true
  'aria-describedby'?: string
}

export interface FieldBaseProps {
  label: string
  hint?: string
  error?: string
  optional?: boolean
  disabled?: boolean
  className?: string
}

interface FieldProps extends FieldBaseProps {
  id?: string
  children: (control: FieldControlProps) => ReactNode
}

export function Field({ label, hint, error, optional, disabled, className, id, children }: FieldProps) {
  const generatedId = useId()
  const controlId = id ?? generatedId
  const messageId = `${controlId}-message`
  const message = error ?? hint

  return (
    <div
      className={cx(styles.field, className)}
      data-invalid={error ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
    >
      <label className={styles.label} htmlFor={controlId}>
        {label}
        {optional ? <span className={styles.optional}>Opcional</span> : null}
      </label>

      {children({
        id: controlId,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': message ? messageId : undefined,
      })}

      {message ? (
        <p id={messageId} className={cx(styles.message, error && styles.error)} role={error ? 'alert' : undefined}>
          {error ? <AlertIcon size={14} /> : null}
          {message}
        </p>
      ) : null}
    </div>
  )
}

export { styles as fieldStyles }
