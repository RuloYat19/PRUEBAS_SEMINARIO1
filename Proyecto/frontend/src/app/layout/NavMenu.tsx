import { NavLink } from 'react-router-dom'
import { cx } from '@/shared/lib'
import { NAV_ITEMS } from '../navigation'
import { ROUTES } from '../paths'
import styles from './NavMenu.module.css'

export function NavMenu({ variant }: { variant: 'top' | 'bottom' }) {
  return (
    <nav className={styles[variant]} aria-label="Secciones">
      {NAV_ITEMS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === ROUTES.inicio}
          className={({ isActive }) => cx(styles.link, isActive && styles.active)}
        >
          <Icon size={variant === 'bottom' ? 22 : 17} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
