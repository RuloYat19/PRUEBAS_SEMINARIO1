import { use } from 'react'
import { SessionContext } from './session-context'

export function useSession() {
  const context = use(SessionContext)
  if (!context) throw new Error('useSession requiere estar dentro de <SessionProvider>')
  return context
}
