import { createIcon } from './createIcon'

export const CloseIcon = createIcon('CloseIcon', <path d="M6 6l12 12M18 6L6 18" />)

export const UploadIcon = createIcon(
  'UploadIcon',
  <path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />,
)

export const ImageIcon = createIcon(
  'ImageIcon',
  <>
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <circle cx="9" cy="10" r="1.75" />
    <path d="M21 16l-5-5-9 9" />
  </>,
)

export const UserIcon = createIcon(
  'UserIcon',
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
  </>,
)

export const MailIcon = createIcon(
  'MailIcon',
  <>
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="M4 7.5l8 5.5 8-5.5" />
  </>,
)

export const LockIcon = createIcon(
  'LockIcon',
  <>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </>,
)

export const EyeIcon = createIcon(
  'EyeIcon',
  <>
    <path d="M2 12s3.64-7 10-7 10 7 10 7-3.64 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </>,
)

export const EyeOffIcon = createIcon(
  'EyeOffIcon',
  <path d="M10.6 5.1A10.7 10.7 0 0 1 12 5c6.36 0 10 7 10 7a17.6 17.6 0 0 1-2.7 3.6M6.6 6.6C3.7 8.5 2 12 2 12s3.64 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />,
)

export const AlertIcon = createIcon(
  'AlertIcon',
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5M12 16h.01" />
  </>,
)

export const InfoIcon = createIcon(
  'InfoIcon',
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </>,
)

export const CheckCircleIcon = createIcon(
  'CheckCircleIcon',
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 12.5l2.5 2.5 4.5-5" />
  </>,
)

export const SunIcon = createIcon(
  'SunIcon',
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4" />
  </>,
)

export const MoonIcon = createIcon('MoonIcon', <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />)

export const LogoutIcon = createIcon(
  'LogoutIcon',
  <path d="M14 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10" />,
)

export const SearchIcon = createIcon(
  'SearchIcon',
  <>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4.2-4.2" />
  </>,
)

export const HomeIcon = createIcon(
  'HomeIcon',
  <path d="M4 10.5L12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 0 1 4 19z" />,
)

export const MessageIcon = createIcon(
  'MessageIcon',
  <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V17A2.5 2.5 0 0 1 4 14.5z" />,
)

export const GlobeIcon = createIcon(
  'GlobeIcon',
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </>,
)

export const SendIcon = createIcon('SendIcon', <path d="M20 4L9.5 14.5M20 4l-6.5 16-4-7.5L2 9z" />)

export const IdCardIcon = createIcon(
  'IdCardIcon',
  <>
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <circle cx="9" cy="11" r="2" />
    <path d="M6 16a3 3 0 0 1 6 0M14.5 10h3.5M14.5 13.5h3.5" />
  </>,
)

export const UsersIcon = createIcon(
  'UsersIcon',
  <>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" />
  </>,
)

export const UserPlusIcon = createIcon(
  'UserPlusIcon',
  <>
    <circle cx="10" cy="8" r="4" />
    <path d="M2.5 20.5a7.5 7.5 0 0 1 12.5-5.6M19 14v6M16 17h6" />
  </>,
)

export const CheckIcon = createIcon('CheckIcon', <path d="M5 12.5l4.5 4.5L19 7.5" />)

export const ArrowLeftIcon = createIcon('ArrowLeftIcon', <path d="M19 12H5M11 6l-6 6 6 6" />)

export const CameraIcon = createIcon(
  'CameraIcon',
  <>
    <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.8l1.5-2h4.4l1.5 2h1.8A2.5 2.5 0 0 1 20 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5z" />
    <circle cx="12" cy="13" r="3.5" />
  </>,
)

export const FaceIcon = createIcon(
  'FaceIcon',
  <>
    <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
    <path d="M9 10v1M15 10v1M9.5 15.5a3.5 3.5 0 0 0 5 0" />
  </>,
)

export const BotIcon = createIcon(
  'BotIcon',
  <>
    <rect x="4" y="8" width="16" height="12" rx="3" />
    <path d="M12 4v4M9 13v1M15 13v1M9.5 17h5" />
  </>,
)
