import { createContext } from 'react'

export interface SessionContextValue {
  token: string | null
  iniciarSesion: (token: string) => void
  cerrarSesion: () => void
}

export const SessionContext = createContext<SessionContextValue | null>(null)
