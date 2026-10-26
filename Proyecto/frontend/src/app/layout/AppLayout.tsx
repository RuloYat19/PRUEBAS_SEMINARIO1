import { Outlet } from 'react-router-dom'
import { PerfilProvider } from '@/perfil'
import { cx } from '@/shared/lib'
import { AppHeader } from './AppHeader'
import { NavMenu } from './NavMenu'
import styles from './AppLayout.module.css'

export function AppLayout() {
  return (
    <PerfilProvider>
      <AppHeader />
      <main className={cx('tf-container', styles.main)}>
        <Outlet />
      </main>
      <NavMenu variant="bottom" />
    </PerfilProvider>
  )
}
