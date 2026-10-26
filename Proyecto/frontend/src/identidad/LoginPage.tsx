import { useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ROUTES } from '@/app/paths'
import { useSession } from '@/app/session'
import { comprimirImagen } from '@/imagenes'
import { ApiError, messageFor } from '@/shared/api'
import { required, useForm, validateEmail } from '@/shared/lib'
import { FaceIcon, LockIcon, MailIcon, Spinner, TextField } from '@/shared/ui/atoms'
import { SegmentedControl } from '@/shared/ui/molecules'
import { CameraCapture } from '@/shared/ui/organisms'
import { AuthCard } from './AuthCard'
import { CORREO_SIN_VERIFICAR, iniciarConPassword, iniciarConRostro } from './identidad.api'
import styles from './Identidad.module.css'

type Modo = 'password' | 'rostro'

function errorDeLogin(error: unknown, correo: string) {
  if (error instanceof ApiError && error.status === CORREO_SIN_VERIFICAR) {
    return (
      <>
        Tu correo aún no está verificado.{' '}
        <Link to={`${ROUTES.verificar}?correo=${encodeURIComponent(correo)}`}>Verificarlo ahora</Link>
      </>
    )
  }
  return messageFor(error, 'No se pudo iniciar sesión.')
}

export function LoginPage() {
  const [params] = useSearchParams()
  const { iniciarSesion } = useSession()
  const [modo, setModo] = useState<Modo>('password')
  const [error, setError] = useState<ReactNode>(null)
  const [comparando, setComparando] = useState(false)

  const form = useForm({ correo: params.get('correo') ?? '', password: '' }, (values) => ({
    correo: validateEmail(values.correo),
    password: modo === 'password' ? required(values.password, 'Ingresa tu contraseña.') : undefined,
  }))
  const correo = form.values.correo.trim().toLowerCase()

  const conPassword = form.handleSubmit(async ({ password }) => {
    setError(null)
    try {
      iniciarSesion(await iniciarConPassword(correo, password))
    } catch (e) {
      setError(errorDeLogin(e, correo))
    }
  })

  function cambiarModo(nuevo: Modo) {
    setModo(nuevo)
    setError(null)
  }

  async function conRostro(foto: Blob) {
    const problema = validateEmail(form.values.correo)
    if (problema) return setError(problema)
    setComparando(true)
    setError(null)
    try {
      iniciarSesion(await iniciarConRostro(correo, await comprimirImagen(foto)))
    } catch (e) {
      setError(errorDeLogin(e, correo))
    } finally {
      setComparando(false)
    }
  }

  return (
    <AuthCard
      overline="Qué bueno verte"
      title="Inicia sesión"
      description="Con tu contraseña o con tu rostro."
      onSubmit={conPassword}
      submitLabel="Entrar"
      submitting={form.submitting}
      error={error}
      hideSubmit={modo === 'rostro'}
      footer={
        <>
          ¿Aún no tienes cuenta? <Link to={ROUTES.registro}>Crea una</Link>
        </>
      }
    >
      <SegmentedControl<Modo>
        label="Forma de iniciar sesión"
        value={modo}
        onChange={cambiarModo}
        fullWidth
        options={[
          { value: 'password', label: 'Contraseña', icon: <LockIcon size={15} /> },
          { value: 'rostro', label: 'Reconocimiento facial', icon: <FaceIcon size={15} /> },
        ]}
      />
      <TextField label="Correo electrónico" type="email" icon={<MailIcon />} autoComplete="username" autoFocus {...form.field('correo')} />

      {modo === 'password' ? (
        <TextField label="Contraseña" type="password" icon={<LockIcon />} autoComplete="current-password" {...form.field('password')} />
      ) : (
        <div className={styles.rostro}>
          <p className="tf-small">Mira a la cámara con buena luz. Compararemos tu rostro con tu foto de perfil.</p>
          {comparando ? (
            <p className={styles.comparando}>
              <Spinner size={18} label="Comparando rostro" /> Comparando con tu foto de perfil…
            </p>
          ) : (
            <CameraCapture onCapture={conRostro} textoBoton="Entrar con mi rostro" />
          )}
        </div>
      )}
    </AuthCard>
  )
}
