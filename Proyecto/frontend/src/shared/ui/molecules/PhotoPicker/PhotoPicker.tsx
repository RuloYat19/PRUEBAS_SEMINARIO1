import { useEffect, useState } from 'react'
import { Avatar, Field, UploadIcon, buttonClass } from '@/shared/ui/atoms'
import styles from './PhotoPicker.module.css'

export interface PhotoPickerProps {
  label: string
  name: string
  value: File | null
  onChange: (file: File | null) => void
  currentUrl?: string | null
  error?: string
}

export function PhotoPicker({ label, name, value, onChange, currentUrl, error }: PhotoPickerProps) {
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!value) return setPreview(null)
    const url = URL.createObjectURL(value)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [value])

  return (
    <Field label={label} error={error} hint="JPG o PNG. Se comprime antes de subirla.">
      {(control) => (
        <div className={styles.row}>
          <Avatar name={name} src={preview ?? currentUrl} size={72} />
          <div className={styles.actions}>
            <label className={buttonClass({ variant: 'secondary', size: 'sm' }, styles.picker)}>
              <UploadIcon size={16} />
              {value || currentUrl ? 'Cambiar foto' : 'Elegir foto'}
              <input
                {...control}
                type="file"
                accept="image/jpeg,image/png"
                className="tf-visually-hidden"
                onChange={(event) => onChange(event.target.files?.[0] ?? null)}
              />
            </label>
            {value ? <span className={`tf-mono ${styles.fileName}`}>{value.name}</span> : null}
          </div>
        </div>
      )}
    </Field>
  )
}
