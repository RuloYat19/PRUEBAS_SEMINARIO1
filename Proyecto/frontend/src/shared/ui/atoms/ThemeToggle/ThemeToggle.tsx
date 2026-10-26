import { useTheme } from '@/shared/ui/theme'
import { IconButton } from '../Button'
import { MoonIcon, SunIcon } from '../Icon'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <IconButton
      icon={isDark ? <SunIcon /> : <MoonIcon />}
      label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      onClick={toggleTheme}
    />
  )
}
