import { useState, type InputHTMLAttributes, type ReactNode, type Ref } from 'react'
import { Field, fieldStyles, type FieldBaseProps } from '../Field'
import { EyeIcon, EyeOffIcon } from '../Icon'

export interface TextFieldProps
  extends FieldBaseProps,
    Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'className'> {
  icon?: ReactNode
  ref?: Ref<HTMLInputElement>
}

export function TextField({ label, hint, error, optional, className, icon, id, type = 'text', ref, ...input }: TextFieldProps) {
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === 'password'

  return (
    <Field {...{ label, hint, error, optional, className, id }} disabled={input.disabled}>
      {(control) => (
        <div className={fieldStyles.control}>
          {icon ? <span className={fieldStyles.adornment}>{icon}</span> : null}
          <input
            {...input}
            {...control}
            ref={ref}
            type={isPassword && revealed ? 'text' : type}
            className={fieldStyles.input}
          />
          {isPassword ? (
            <button
              type="button"
              className={fieldStyles.trailing}
              onClick={() => setRevealed((value) => !value)}
              aria-label={revealed ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {revealed ? <EyeOffIcon size={17} /> : <EyeIcon size={17} />}
            </button>
          ) : null}
        </div>
      )}
    </Field>
  )
}
