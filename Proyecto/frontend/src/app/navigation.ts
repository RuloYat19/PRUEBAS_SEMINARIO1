import { HomeIcon, MessageIcon, UserIcon, UsersIcon, type IconComponent } from '@/shared/ui/atoms'
import { ROUTES } from './paths'

export interface NavItem {
  to: string
  label: string
  Icon: IconComponent
}

export const NAV_ITEMS: NavItem[] = [
  { to: ROUTES.inicio, label: 'Inicio', Icon: HomeIcon },
  { to: ROUTES.amigos, label: 'Personas', Icon: UsersIcon },
  { to: ROUTES.chat, label: 'Chat', Icon: MessageIcon },
  { to: ROUTES.perfil, label: 'Perfil', Icon: UserIcon },
]
