import { useMemo, type ReactNode } from 'react'
import { useResource } from '@/shared/lib'
import { obtenerPerfil, type Perfil } from './perfil.api'
import { PerfilContext } from './perfil-context'

export function PerfilProvider({ children }: { children: ReactNode }) {
  const { data, setData, status, error, reload } = useResource(obtenerPerfil, null as Perfil | null)

  const value = useMemo(
    () => ({ perfil: data, status, error, recargar: reload, reemplazar: setData }),
    [data, status, error, reload, setData],
  )

  return <PerfilContext value={value}>{children}</PerfilContext>
}
