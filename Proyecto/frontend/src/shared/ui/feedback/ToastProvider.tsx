import { useCallback, useState, type ReactNode } from 'react'
import { Alert } from '@/shared/ui/molecules'
import { ToastContext, type ToastInput } from './toast-context'
import styles from './ToastProvider.module.css'

const DURATION_MS = 4200
const MAX_VISIBLE = 3

interface ToastItem extends ToastInput {
  id: number
}

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback(
    (toast: ToastInput) => {
      const id = ++nextId
      setToasts((current) => [...current, { ...toast, id }].slice(-MAX_VISIBLE))
      window.setTimeout(() => dismiss(id), DURATION_MS)
    },
    [dismiss],
  )

  return (
    <ToastContext value={notify}>
      {children}
      <div className={styles.region} aria-live="polite">
        {toasts.map((toast) => (
          <Alert
            key={toast.id}
            tone={toast.tone ?? 'success'}
            title={toast.title}
            elevated
            onDismiss={() => dismiss(toast.id)}
          >
            {toast.message}
          </Alert>
        ))}
      </div>
    </ToastContext>
  )
}
