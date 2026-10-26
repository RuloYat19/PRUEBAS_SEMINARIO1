import { Link, useNavigate } from 'react-router-dom'
import { ROUTES } from '@/app/paths'
import { subirImagen, validarTipo } from '@/imagenes'
import { required, useForm, validateDpi, validateEmail, validateMatch, validatePassword } from '@/shared/lib'
import { IdCardIcon, LockIcon, MailIcon, TextField, UserIcon } from '@/shared/ui/atoms'
import { useToast } from '@/shared/ui/feedback'
import { AuthCard } from './AuthCard'
import { FotoRegistro } from './FotoRegistro'
import { registrar } from './identidad.api'

const MAX_NOMBRE = 150

export function RegistroPage() {
  const navigate = useNavigate()
  const notify = useToast()
  const form = useForm(
    { nombreCompleto: '', correo: '', dpi: '', password: '', confirmacion: '', foto: null as File | null },
    (values) => ({
      nombreCompleto:
        required(values.nombreCompleto, 'Ingresa tu nombre completo.') ??
        (values.nombreCompleto.trim().length > MAX_NOMBRE ? `Usa como máximo ${MAX_NOMBRE} caracteres.` : undefined),
      correo: validateEmail(values.correo),
      dpi: validateDpi(values.dpi),
      password: validatePassword(values.password),
      confirmacion: validateMatch(values.confirmacion, values.password),
      foto: values.foto ? validarTipo(values.foto) : 'La foto de perfil es obligatoria: sirve para el login facial.',
    }),
  )

  const enviar = form.handleSubmit(async ({ nombreCompleto, correo, dpi, password, foto }) => {
    if (!foto) return
    const { key } = await subirImagen('Fotos_Perfil', foto)
    const correoLimpio = correo.trim().toLowerCase()
    await registrar({ nombreCompleto: nombreCompleto.trim(), correo: correoLimpio, dpi: dpi.trim(), password, fotoPerfilKey: key })
    notify({ title: 'Cuenta creada', message: `Te enviamos un código a ${correoLimpio}.` })
    navigate(`${ROUTES.verificar}?correo=${encodeURIComponent(correoLimpio)}`)
  })

  return (
    <AuthCard
      overline="Únete"
      title={
        <>
          Crea tu <span className="tf-accent-italic">cuenta</span>
        </>
      }
      description="Te enviaremos un código para verificar tu correo."
      onSubmit={enviar}
      submitLabel="Crear cuenta"
      submitting={form.submitting}
      error={form.formError}
      footer={
        <>
          ¿Ya tienes cuenta? <Link to={ROUTES.login}>Inicia sesión</Link>
        </>
      }
    >
      <FotoRegistro
        nombre={form.values.nombreCompleto}
        value={form.values.foto}
        onChange={(foto) => form.setValue('foto', foto)}
        error={form.errors.foto}
      />
      <TextField label="Nombre completo" icon={<UserIcon />} autoComplete="name" maxLength={MAX_NOMBRE} {...form.field('nombreCompleto')} />
      <TextField label="Correo electrónico" type="email" icon={<MailIcon />} autoComplete="email" inputMode="email" {...form.field('correo')} />
      <TextField label="DPI" icon={<IdCardIcon />} inputMode="numeric" maxLength={13} hint="13 dígitos, sin espacios." {...form.field('dpi')} />
      <TextField
        label="Contraseña"
        type="password"
        icon={<LockIcon />}
        autoComplete="new-password"
        hint="Mínimo 8 caracteres con mayúscula, minúscula, número y símbolo."
        {...form.field('password')}
      />
      <TextField label="Confirmar contraseña" type="password" icon={<LockIcon />} autoComplete="new-password" {...form.field('confirmacion')} />
    </AuthCard>
  )
}
