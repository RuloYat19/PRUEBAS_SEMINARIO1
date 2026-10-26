import { Route, Routes } from 'react-router-dom'
import { AmistadesPage } from '@/amistades'
import { ChatPage } from '@/chat'
import { LoginPage, RegistroPage, VerificarPage } from '@/identidad'
import { PerfilPage } from '@/perfil'
import { AccessRoute } from './AccessRoute'
import { AppLayout } from './layout/AppLayout'
import { AuthLayout } from './layout/AuthLayout'
import { InicioPage } from './pages/InicioPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ROUTES } from './paths'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AccessRoute access="guest" />}>
        <Route element={<AuthLayout />}>
          <Route path={ROUTES.login} element={<LoginPage />} />
          <Route path={ROUTES.registro} element={<RegistroPage />} />
          <Route path={ROUTES.verificar} element={<VerificarPage />} />
        </Route>
      </Route>

      <Route element={<AccessRoute access="private" />}>
        <Route element={<AppLayout />}>
          <Route path={ROUTES.inicio} element={<InicioPage />} />
          <Route path={ROUTES.amigos} element={<AmistadesPage />} />
          <Route path={`${ROUTES.chat}/:amigoId?`} element={<ChatPage />} />
          <Route path={ROUTES.perfil} element={<PerfilPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
