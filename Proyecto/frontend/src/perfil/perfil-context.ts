import { createContext } from 'react'
import type { ResourceStatus } from '@/shared/lib'
import type { Perfil } from './perfil.api'

export interface PerfilContextValue {
  perfil: Perfil | null
  status: ResourceStatus
  error: string | null
  recargar: () => void
  reemplazar: (perfil: Perfil) => void
}

export const PerfilContext = createContext<PerfilContextValue | null>(null)
