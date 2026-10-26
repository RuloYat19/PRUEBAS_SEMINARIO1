/**
 * La Lambda de imágenes solo acepta JPEG o PNG de hasta 4 MB (es lo que admite Rekognition).
 * Antes de subir se reduce la imagen a 1920 px por lado y se pasa a JPEG; si aún pesa
 * demasiado, se baja la calidad.
 */

const LADO_MAXIMO = 1920
const BYTES_MAXIMOS = 4 * 1024 * 1024
const CALIDADES = [0.85, 0.7, 0.55, 0.4]

export const TIPOS_ACEPTADOS = ['image/jpeg', 'image/png']

function cargar(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const imagen = new Image()
    imagen.onload = () => {
      URL.revokeObjectURL(url)
      resolve(imagen)
    }
    imagen.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen'))
    }
    imagen.src = url
  })
}

function aBlob(canvas: HTMLCanvasElement, calidad: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo comprimir la imagen'))),
      'image/jpeg',
      calidad,
    )
  })
}

function aDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader()
    lector.onload = () => resolve(lector.result as string)
    lector.onerror = () => reject(new Error('No se pudo leer la imagen'))
    lector.readAsDataURL(blob)
  })
}

/** Devuelve un data URL `data:image/jpeg;base64,...` listo para POST /imagenes. */
export async function comprimirImagen(file: File): Promise<string> {
  if (!TIPOS_ACEPTADOS.includes(file.type)) {
    throw new Error('La imagen debe ser JPG o PNG')
  }

  const imagen = await cargar(file)
  const escala = Math.min(1, LADO_MAXIMO / Math.max(imagen.width, imagen.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(imagen.width * escala)
  canvas.height = Math.round(imagen.height * escala)

  const contexto = canvas.getContext('2d')
  if (!contexto) throw new Error('No se pudo comprimir la imagen')
  // Fondo blanco: un PNG con transparencia quedaría negro al pasarlo a JPEG.
  contexto.fillStyle = '#ffffff'
  contexto.fillRect(0, 0, canvas.width, canvas.height)
  contexto.drawImage(imagen, 0, 0, canvas.width, canvas.height)

  for (const calidad of CALIDADES) {
    const blob = await aBlob(canvas, calidad)
    if (blob.size <= BYTES_MAXIMOS) return aDataUrl(blob)
  }
  throw new Error('La imagen es demasiado grande, incluso comprimida')
}
