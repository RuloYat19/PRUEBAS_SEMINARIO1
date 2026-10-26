import type { CSSProperties } from 'react'

export function cssVars(vars: Record<`--${string}`, string>) {
  return vars as CSSProperties
}
