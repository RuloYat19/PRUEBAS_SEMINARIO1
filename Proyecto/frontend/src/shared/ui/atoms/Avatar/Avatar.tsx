import { cssVars, initials } from '@/shared/lib'
import { UserIcon } from '../Icon'
import { SafeImage } from '../SafeImage'
import styles from './Avatar.module.css'

export interface AvatarProps {
  name: string
  src?: string | null
  size?: number
}

export function Avatar({ name, src, size = 36 }: AvatarProps) {
  const fallback = name.trim() ? (
    <span role="img" aria-label={name}>
      {initials(name)}
    </span>
  ) : (
    <UserIcon size={Math.round(size * 0.45)} />
  )

  return (
    <span className={styles.avatar} style={cssVars({ '--size': `${size}px` })}>
      <SafeImage src={src ?? undefined} alt={name} fallback={fallback} />
    </span>
  )
}
