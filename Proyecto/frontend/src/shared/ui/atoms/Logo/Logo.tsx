import { cx } from '@/shared/lib'
import styles from './Logo.module.css'

export interface LogoProps {
  size?: 'sm' | 'md'
  compact?: boolean
  className?: string
}

function LogoMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="currentColor" />
      <path
        d="M9 11.5a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3h-5l-4 3.5V19.4a3 3 0 0 1-2-2.9z"
        fill="none"
        stroke="var(--tf-text-on-accent)"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <circle cx="13" cy="14" r="1.3" fill="var(--tf-text-on-accent)" />
      <circle cx="16" cy="14" r="1.3" fill="var(--tf-text-on-accent)" />
      <circle cx="19" cy="14" r="1.3" fill="var(--tf-text-on-accent)" />
    </svg>
  )
}

export function Logo({ size = 'md', compact = false, className }: LogoProps) {
  return (
    <span className={cx(styles.logo, styles[size], className)} role="img" aria-label="Semi-Social">
      <LogoMark className={styles.mark} />
      {compact ? null : (
        <span className={styles.wordmark} aria-hidden="true">
          Semi<span className={styles.sub}>Social</span>
        </span>
      )}
    </span>
  )
}
