import { use } from 'react'
import { PerfilContext } from './perfil-context'

export function usePerfil() {
  const context = use(PerfilContext)
  if (!context) throw new Error('usePerfil requiere estar dentro de <PerfilProvider>')
  return context
}
