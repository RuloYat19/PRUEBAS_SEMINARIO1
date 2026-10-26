import { useState } from 'react'
import { Button, CameraIcon, UploadIcon } from '@/shared/ui/atoms'
import { PhotoPicker, SegmentedControl } from '@/shared/ui/molecules'
import { CameraCapture } from '@/shared/ui/organisms'
import styles from './Identidad.module.css'

type Origen = 'archivo' | 'camara'

interface Props {
  nombre: string
  value: File | null
  onChange: (foto: File | null) => void
  error?: string
}

export function FotoRegistro({ nombre, value, onChange, error }: Props) {
  const [origen, setOrigen] = useState<Origen>('archivo')
  const capturada = origen === 'camara' && value

  function cambiarOrigen(nuevo: Origen) {
    setOrigen(nuevo)
    onChange(null)
  }

  return (
    <div className={styles.foto}>
      <SegmentedControl<Origen>
        label="Origen de la foto de perfil"
        value={origen}
        onChange={cambiarOrigen}
        fullWidth
        options={[
          { value: 'archivo', label: 'Subir archivo', icon: <UploadIcon size={15} /> },
          { value: 'camara', label: 'Usar cámara', icon: <CameraIcon size={15} /> },
        ]}
      />

      {origen === 'archivo' || capturada ? (
        <PhotoPicker label="Foto de perfil" name={nombre} value={value} onChange={onChange} error={error} />
      ) : (
        <CameraCapture onCapture={(foto) => onChange(new File([foto], 'webcam.jpg', { type: 'image/jpeg' }))} />
      )}

      {capturada ? (
        <Button variant="ghost" size="sm" icon={<CameraIcon size={15} />} onClick={() => onChange(null)}>
          Tomar otra
        </Button>
      ) : null}
      {origen === 'camara' && !value && error ? <p className={styles.errorFoto}>{error}</p> : null}
    </div>
  )
}
