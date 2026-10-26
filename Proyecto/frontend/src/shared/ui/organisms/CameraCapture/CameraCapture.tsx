import { useEffect, useRef, useState } from 'react'
import { Button, CameraIcon, Spinner } from '@/shared/ui/atoms'
import { Alert } from '@/shared/ui/molecules'
import styles from './CameraCapture.module.css'

type Estado = 'iniciando' | 'lista' | 'error'

export interface CameraCaptureProps {
  onCapture: (foto: Blob) => void
  textoBoton?: string
}

function mensajeDeError(error: unknown) {
  const nombre = error instanceof DOMException ? error.name : ''
  if (nombre === 'NotAllowedError') return 'Permite el acceso a la cámara en el navegador para continuar.'
  if (nombre === 'NotFoundError') return 'No encontramos una cámara en este dispositivo.'
  return 'No se pudo abrir la cámara.'
}

export function CameraCapture({ onCapture, textoBoton = 'Tomar foto' }: CameraCaptureProps) {
  const video = useRef<HTMLVideoElement>(null)
  const [estado, setEstado] = useState<Estado>('iniciando')
  const [error, setError] = useState('')

  useEffect(() => {
    let flujo: MediaStream | null = null
    let vigente = true

    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 } }, audio: false })
      .then((stream) => {
        if (!vigente) return stream.getTracks().forEach((track) => track.stop())
        flujo = stream
        if (video.current) video.current.srcObject = stream
      })
      .catch((e) => {
        if (!vigente) return
        setError(mensajeDeError(e))
        setEstado('error')
      })

    if (!navigator.mediaDevices) {
      setError('Este navegador no permite usar la cámara.')
      setEstado('error')
    }

    return () => {
      vigente = false
      flujo?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  function capturar() {
    const fuente = video.current
    if (!fuente?.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = fuente.videoWidth
    canvas.height = fuente.videoHeight
    canvas.getContext('2d')?.drawImage(fuente, 0, 0)
    canvas.toBlob((blob) => blob && onCapture(blob), 'image/jpeg', 0.9)
  }

  if (estado === 'error') return <Alert tone="warning">{error}</Alert>

  return (
    <div className={styles.camara}>
      <div className={styles.visor}>
        <video ref={video} autoPlay playsInline muted className={styles.video} onPlaying={() => setEstado('lista')} />
        {estado === 'iniciando' ? (
          <span className={styles.cargando}>
            <Spinner size={24} label="Abriendo la cámara" />
          </span>
        ) : null}
      </div>
      <Button variant="secondary" icon={<CameraIcon size={16} />} onClick={capturar} disabled={estado !== 'lista'} fullWidth>
        {textoBoton}
      </Button>
    </div>
  )
}
