import { cx } from '@/shared/lib'
import styles from './Skeleton.module.css'

export interface SkeletonProps {
  width?: number | string
  height?: number | string
  circle?: boolean
  className?: string
}

export function Skeleton({ width = '100%', height = 14, circle = false, className }: SkeletonProps) {
  return (
    <span
      className={cx(styles.skeleton, circle && styles.circle, className)}
      style={{ width, height }}
      aria-hidden="true"
    />
  )
}
