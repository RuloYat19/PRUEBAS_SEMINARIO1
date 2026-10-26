import { useState, type FormEvent } from 'react'
import { cx } from '@/shared/lib'
import { fieldStyles, IconButton, SendIcon } from '@/shared/ui/atoms'
import styles from './Composer.module.css'

export interface ComposerProps {
  id: string
  label: string
  placeholder: string
  maxLength: number
  onSend: (texto: string) => Promise<void> | void
  disabled?: boolean
}

export function Composer({ id, label, placeholder, maxLength, onSend, disabled = false }: ComposerProps) {
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    const limpio = texto.trim()
    if (!limpio) return
    setEnviando(true)
    try {
      await onSend(limpio)
      setTexto('')
    } catch {} finally {
      setEnviando(false)
    }
  }

  return (
    <form className={styles.composer} onSubmit={enviar}>
      <label htmlFor={id} className="tf-visually-hidden">
        {label}
      </label>
      <div className={cx(fieldStyles.control, styles.caja)}>
        <input
          id={id}
          className={fieldStyles.input}
          placeholder={placeholder}
          maxLength={maxLength}
          autoComplete="off"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          disabled={disabled || enviando}
        />
      </div>
      <IconButton
        type="submit"
        variant="primary"
        icon={<SendIcon size={16} />}
        label="Enviar"
        disabled={disabled || enviando || !texto.trim()}
      />
    </form>
  )
}
