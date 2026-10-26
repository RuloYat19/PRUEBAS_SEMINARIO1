import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { buttonClass, type ButtonStyleProps } from './Button.styles'

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'children'>,
    Pick<ButtonStyleProps, 'variant' | 'size'> {
  icon: ReactNode
  label: string
  type?: 'button' | 'submit'
}

export function IconButton({ icon, label, variant = 'ghost', size, type = 'button', className, ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, iconOnly: true }, className)}
      aria-label={label}
      title={label}
      {...rest}
    >
      {icon}
    </button>
  )
}
