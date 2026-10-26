import { use } from 'react'
import { ThemeContext } from './theme-context'

export function useTheme() {
  const context = use(ThemeContext)
  if (!context) throw new Error('useTheme requiere estar dentro de <ThemeProvider>')
  return context
}
