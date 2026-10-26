import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { setAuthToken, setUnauthorizedHandler } from '@/shared/api'
import { SessionContext } from './session-context'

const STORAGE_KEY = 'semisocial:token'

function leerToken() {
  try {
    const token = localStorage.getItem(STORAGE_KEY)
    setAuthToken(token)
    return token
  } catch {
    return null
  }
}

function guardarToken(token: string | null) {
  setAuthToken(token)
  try {
    if (token) localStorage.setItem(STORAGE_KEY, token)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {}
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(leerToken)

  const aplicar = useCallback((nuevo: string | null) => {
    guardarToken(nuevo)
    setToken(nuevo)
  }, [])

  const iniciarSesion = useCallback((nuevo: string) => aplicar(nuevo), [aplicar])
  const cerrarSesion = useCallback(() => aplicar(null), [aplicar])

  useEffect(() => {
    setUnauthorizedHandler(cerrarSesion)
    return () => setUnauthorizedHandler(null)
  }, [cerrarSesion])

  const value = useMemo(() => ({ token, iniciarSesion, cerrarSesion }), [token, iniciarSesion, cerrarSesion])

  return <SessionContext value={value}>{children}</SessionContext>
}
