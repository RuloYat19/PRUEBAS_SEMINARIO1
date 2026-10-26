import { ButtonLink, SearchIcon } from '@/shared/ui/atoms'
import { EmptyState } from '@/shared/ui/molecules'
import { ROUTES } from '../paths'
import styles from './NotFoundPage.module.css'

export function NotFoundPage() {
  return (
    <div className={styles.page}>
      <EmptyState
        icon={<SearchIcon size={24} />}
        tone="neutral"
        title="Esta página no existe"
        description="Puede que el enlace esté roto o que la página se haya movido."
        action={<ButtonLink to={ROUTES.inicio}>Volver al inicio</ButtonLink>}
      />
    </div>
  )
}
