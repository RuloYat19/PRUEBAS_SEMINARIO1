const LADO_MAXIMO = 1600
const BYTES_MAXIMOS = 4 * 1024 * 1024
const CALIDADES = [0.85, 0.7, 0.55, 0.4]

export const TIPOS_ACEPTADOS = ['image/jpeg', 'image/png']

function cargar(file: Blob): Promise<HTMLImageElement> {
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

export function validarTipo(file: Blob) {
  return TIPOS_ACEPTADOS.includes(file.type) ? undefined : 'La imagen debe ser JPG o PNG.'
}

export async function comprimirImagen(file: Blob): Promise<string> {
  const problema = validarTipo(file)
  if (problema) throw new Error(problema)

  const imagen = await cargar(file)
  const escala = Math.min(1, LADO_MAXIMO / Math.max(imagen.width, imagen.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(imagen.width * escala)
  canvas.height = Math.round(imagen.height * escala)

  const contexto = canvas.getContext('2d')
  if (!contexto) throw new Error('No se pudo comprimir la imagen')
  contexto.fillStyle = '#ffffff'
  contexto.fillRect(0, 0, canvas.width, canvas.height)
  contexto.drawImage(imagen, 0, 0, canvas.width, canvas.height)

  for (const calidad of CALIDADES) {
    const blob = await aBlob(canvas, calidad)
    if (blob.size <= BYTES_MAXIMOS) return aDataUrl(blob)
  }
  throw new Error('La imagen es demasiado grande, incluso comprimida')
}
