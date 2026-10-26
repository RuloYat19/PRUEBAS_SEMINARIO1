import { BrowserRouter } from 'react-router-dom'
import { ToastProvider } from '@/shared/ui/feedback'
import { ThemeProvider } from '@/shared/ui/theme'
import { AppRoutes } from './AppRoutes'
import { SessionProvider } from './session'

export function App() {
  return (
    <ThemeProvider>
      <SessionProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ToastProvider>
      </SessionProvider>
    </ThemeProvider>
  )
}
