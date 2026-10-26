import { Outlet } from 'react-router-dom'
import { cx } from '@/shared/lib'
import { GlobeIcon, IconBox, ImageIcon, Logo, MessageIcon, ThemeToggle } from '@/shared/ui/atoms'
import styles from './AuthLayout.module.css'

const FEATURES = [
  { icon: <ImageIcon />, tone: 'accent', title: 'Comparte tus fotos', text: 'Publica y descubre lo que pasa por etiquetas.' },
  { icon: <MessageIcon />, tone: 'sky', title: 'Conversa con tus amigos', text: 'Comentarios y chat en tiempo real.' },
  { icon: <GlobeIcon />, tone: 'neutral', title: 'Sin barreras de idioma', text: 'Traduce publicaciones y comentarios al instante.' },
] as const

export function AuthLayout() {
  return (
    <div className={styles.layout}>
      <aside className={styles.aside}>
        <Logo size="md" />
        <div className={styles.pitch}>
          <h2 className="tf-display">
            Tu facultad, <span className="tf-accent-italic">conectada</span>.
          </h2>
          <p className="tf-body-lg">La red social de Ingeniería, en la nube.</p>
        </div>
        <ul className={styles.features}>
          {FEATURES.map((feature) => (
            <li key={feature.title} className={styles.feature}>
              <IconBox icon={feature.icon} tone={feature.tone} size={40} />
              <div>
                <strong>{feature.title}</strong>
                <span className="tf-small">{feature.text}</span>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      <div className={styles.main}>
        <div className={cx('tf-container', styles.topbar)}>
          <span className={styles.brand}>
            <Logo size="sm" />
          </span>
          <ThemeToggle />
        </div>
        <main className={cx('tf-container', styles.content)}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
