import { useState, type ImgHTMLAttributes, type ReactNode } from 'react'

export interface SafeImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  fallback: ReactNode
}

export function SafeImage({ fallback, src, onError, ...rest }: SafeImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | undefined>()

  if (!src || failedSrc === src) return <>{fallback}</>

  return (
    <img
      src={src}
      onError={(event) => {
        setFailedSrc(src)
        onError?.(event)
      }}
      {...rest}
    />
  )
}
