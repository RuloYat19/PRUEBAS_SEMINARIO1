import { Link } from 'react-router-dom'
import { Chatbot } from '@/chatbot'
import { usePerfil } from '@/perfil'
import { cx } from '@/shared/lib'
import { Avatar, IconButton, Logo, LogoutIcon, ThemeToggle } from '@/shared/ui/atoms'
import { ROUTES } from '../paths'
import { useSession } from '../session'
import { NavMenu } from './NavMenu'
import styles from './AppHeader.module.css'

export function AppHeader() {
  const { cerrarSesion } = useSession()
  const { perfil } = usePerfil()
  const nombre = perfil?.nombreCompleto ?? ''

  return (
    <header className={styles.header}>
      <div className={cx('tf-container', styles.inner)}>
        <Link to={ROUTES.inicio} className={styles.brand} aria-label="Ir al inicio">
          <Logo size="sm" />
        </Link>

        <NavMenu variant="top" />

        <div className={styles.tools}>
          <Chatbot />
          <span className={styles.theme}>
            <ThemeToggle />
          </span>
          <Link to={ROUTES.perfil} className={styles.account} aria-label="Mi perfil">
            <Avatar name={nombre} src={perfil?.fotoPerfilUrl} size={32} />
            <span className={styles.username}>{nombre}</span>
          </Link>
          <IconButton icon={<LogoutIcon />} label="Cerrar sesión" onClick={cerrarSesion} />
        </div>
      </div>
    </header>
  )
}
