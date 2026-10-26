import type { ReactNode } from 'react'
import { cx } from '@/shared/lib'
import styles from './SegmentedControl.module.css'

export interface SegmentOption<T extends string> {
  value: T
  label: string
  icon?: ReactNode
  count?: number
}

export interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<SegmentOption<T>>
  value: T
  onChange: (value: T) => void
  label: string
  fullWidth?: boolean
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  fullWidth = false,
}: SegmentedControlProps<T>) {
  return (
    <div className={cx(styles.group, fullWidth && styles.fullWidth)} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={styles.option}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          {option.label}
          {option.count !== undefined ? <span className={styles.count}>{option.count}</span> : null}
        </button>
      ))}
    </div>
  )
}
