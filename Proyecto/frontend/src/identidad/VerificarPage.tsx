import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ROUTES } from '@/app/paths'
import { messageFor } from '@/shared/api'
import { required, useForm, validateEmail } from '@/shared/lib'
import { Button, LockIcon, MailIcon, TextField } from '@/shared/ui/atoms'
import { useToast } from '@/shared/ui/feedback'
import { AuthCard } from './AuthCard'
import { reenviarCodigo, verificarCorreo } from './identidad.api'

const CODIGO = /^\d{6}$/

export function VerificarPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const notify = useToast()
  const [reenviando, setReenviando] = useState(false)
  const form = useForm({ correo: params.get('correo') ?? '', codigo: '' }, (values) => ({
    correo: validateEmail(values.correo),
    codigo: required(values.codigo, 'Ingresa el código.') ?? (CODIGO.test(values.codigo.trim()) ? undefined : 'El código tiene 6 dígitos.'),
  }))

  const verificar = form.handleSubmit(async ({ correo, codigo }) => {
    const limpio = correo.trim().toLowerCase()
    await verificarCorreo(limpio, codigo.trim())
    notify({ title: 'Correo verificado', message: 'Ya puedes iniciar sesión.' })
    navigate(`${ROUTES.login}?correo=${encodeURIComponent(limpio)}`)
  })

  async function reenviar() {
    if (validateEmail(form.values.correo)) return notify({ tone: 'warning', title: 'Escribe tu correo para reenviar el código' })
    setReenviando(true)
    try {
      await reenviarCodigo(form.values.correo.trim().toLowerCase())
      notify({ title: 'Código reenviado', message: 'Revisa tu bandeja de entrada y la de spam.' })
    } catch (error) {
      notify({ tone: 'danger', title: 'No se pudo reenviar el código', message: messageFor(error) })
    } finally {
      setReenviando(false)
    }
  }

  return (
    <AuthCard
      overline="Un paso más"
      title="Verifica tu correo"
      description="Escribe el código de 6 dígitos que te enviamos."
      onSubmit={verificar}
      submitLabel="Verificar"
      submitting={form.submitting}
      error={form.formError}
      footer={
        <>
          ¿Ya verificaste? <Link to={ROUTES.login}>Inicia sesión</Link>
        </>
      }
    >
      <TextField label="Correo electrónico" type="email" icon={<MailIcon />} autoComplete="email" {...form.field('correo')} />
      <TextField label="Código" icon={<LockIcon />} inputMode="numeric" autoComplete="one-time-code" maxLength={6} {...form.field('codigo')} />
      <Button variant="ghost" size="sm" onClick={reenviar} loading={reenviando}>
        Reenviar código
      </Button>
    </AuthCard>
  )
}
