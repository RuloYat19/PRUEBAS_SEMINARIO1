import { useEffect, useId, useRef, type ReactNode } from 'react'
import { CloseIcon, IconButton } from '@/shared/ui/atoms'
import { cx } from '@/shared/lib'
import styles from './Dialog.module.css'

export interface DialogProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  size?: 'md' | 'lg'
  children: ReactNode
}

export function Dialog({ open, onClose, title, description, size = 'md', children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={cx(styles.dialog, size === 'lg' && styles.lg)}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      {open ? (
        <div className={styles.panel}>
          <header className={styles.header}>
            <div className={styles.heading}>
              <h2 id={titleId} className="tf-h2">
                {title}
              </h2>
              {description ? <p className="tf-small">{description}</p> : null}
            </div>
            <IconButton className={styles.close} icon={<CloseIcon />} label="Cerrar" onClick={onClose} />
          </header>
          {children}
        </div>
      ) : null}
    </dialog>
  )
}

export function DialogBody({ children }: { children: ReactNode }) {
  return <div className={styles.body}>{children}</div>
}

export function DialogFooter({ children }: { children: ReactNode }) {
  return <footer className={styles.footer}>{children}</footer>
}
