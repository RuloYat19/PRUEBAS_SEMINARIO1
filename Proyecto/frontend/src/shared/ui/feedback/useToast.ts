import { use } from 'react'
import { ToastContext } from './toast-context'

export function useToast() {
  const notify = use(ToastContext)
  if (!notify) throw new Error('useToast requiere estar dentro de <ToastProvider>')
  return notify
}
