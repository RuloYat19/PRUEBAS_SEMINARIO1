import { Navigate, Outlet } from 'react-router-dom'
import { ROUTES } from './paths'
import { useSession } from './session'

export function AccessRoute({ access }: { access: 'private' | 'guest' }) {
  const { token } = useSession()

  if (access === 'private' && !token) return <Navigate to={ROUTES.login} replace />
  if (access === 'guest' && token) return <Navigate to={ROUTES.inicio} replace />
  return <Outlet />
}
