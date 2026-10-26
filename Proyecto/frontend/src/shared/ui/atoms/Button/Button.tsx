import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Spinner } from '../Spinner'
import { buttonClass, buttonStyles, type ButtonStyleProps } from './Button.styles'

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'>,
    Omit<ButtonStyleProps, 'iconOnly'> {
  icon?: ReactNode
  loading?: boolean
  type?: 'button' | 'submit' | 'reset'
}

export function Button({
  variant,
  size,
  fullWidth,
  icon,
  loading = false,
  type = 'button',
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, fullWidth }, loading && buttonStyles.loading, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {icon ? <span className={buttonStyles.icon}>{icon}</span> : null}
      {children ? <span>{children}</span> : null}
      {loading ? (
        <span className={buttonStyles.spinner}>
          <Spinner size={16} />
        </span>
      ) : null}
    </button>
  )
}
