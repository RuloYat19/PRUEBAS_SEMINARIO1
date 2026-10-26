import { createContext } from 'react'
import type { Tone } from '@/shared/ui/types'

export interface ToastInput {
  tone?: Tone
  title: string
  message?: string
}

export type Notify = (toast: ToastInput) => void

export const ToastContext = createContext<Notify | null>(null)
