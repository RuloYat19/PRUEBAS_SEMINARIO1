import type { ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { buttonClass, buttonStyles, type ButtonStyleProps } from './Button.styles'

export interface ButtonLinkProps extends LinkProps, Omit<ButtonStyleProps, 'iconOnly'> {
  icon?: ReactNode
}

export function ButtonLink({ variant, size, fullWidth, icon, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClass({ variant, size, fullWidth }, className)} {...rest}>
      {icon ? <span className={buttonStyles.icon}>{icon}</span> : null}
      {children}
    </Link>
  )
}
