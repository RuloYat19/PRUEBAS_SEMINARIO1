import { validarTipo, subirImagen } from '@/imagenes'
import { required, useForm, validateDpi } from '@/shared/lib'
import { Button, IdCardIcon, LockIcon, MailIcon, Skeleton, Surface, TextField, UserIcon } from '@/shared/ui/atoms'
import { useToast } from '@/shared/ui/feedback'
import { Alert, PageHeader, PhotoPicker } from '@/shared/ui/molecules'
import { ResourceView } from '@/shared/ui/organisms'
import { actualizarPerfil, type Perfil } from './perfil.api'
import { usePerfil } from './usePerfil'
import styles from './PerfilPage.module.css'

const MAX_NOMBRE = 150

function FormularioPerfil({ perfil, onGuardado }: { perfil: Perfil; onGuardado: (perfil: Perfil) => void }) {
  const notify = useToast()
  const form = useForm(
    { nombreCompleto: perfil.nombreCompleto, dpi: perfil.dpi, password: '', foto: null as File | null },
    (values) => ({
      nombreCompleto:
        required(values.nombreCompleto, 'Ingresa tu nombre completo.') ??
        (values.nombreCompleto.trim().length > MAX_NOMBRE ? `Usa como máximo ${MAX_NOMBRE} caracteres.` : undefined),
      dpi: validateDpi(values.dpi),
      password: required(values.password, 'Ingresa tu contraseña actual para guardar los cambios.'),
      foto: values.foto ? validarTipo(values.foto) : undefined,
    }),
  )

  const guardar = form.handleSubmit(async ({ nombreCompleto, dpi, password, foto }) => {
    const fotoPerfilKey = foto ? (await subirImagen('Fotos_Perfil', foto)).key : undefined
    const actualizado = await actualizarPerfil({
      nombreCompleto: nombreCompleto.trim(),
      dpi: dpi.trim(),
      password,
      ...(fotoPerfilKey ? { fotoPerfilKey } : {}),
    })
    onGuardado(actualizado)
    form.setValue('password', '')
    form.setValue('foto', null)
    notify({ title: 'Perfil actualizado', message: 'Los cambios ya están en tu cuenta y en el login facial.' })
  })

  return (
    <Surface className={styles.tarjeta}>
      <form className={styles.form} onSubmit={guardar} noValidate>
        <PhotoPicker
          label="Foto de perfil"
          name={form.values.nombreCompleto}
          value={form.values.foto}
          currentUrl={perfil.fotoPerfilUrl}
          onChange={(file) => form.setValue('foto', file)}
          error={form.errors.foto}
        />
        <TextField label="Correo electrónico" icon={<MailIcon />} value={perfil.correo} readOnly disabled hint="Es tu usuario para iniciar sesión; no se puede cambiar." />
        <TextField label="Nombre completo" icon={<UserIcon />} autoComplete="name" maxLength={MAX_NOMBRE} {...form.field('nombreCompleto')} />
        <TextField label="DPI" icon={<IdCardIcon />} inputMode="numeric" maxLength={13} {...form.field('dpi')} />

        <div className={styles.confirmacion}>
          <TextField
            label="Contraseña actual"
            type="password"
            icon={<LockIcon />}
            autoComplete="current-password"
            hint="Por seguridad, la pedimos cada vez que guardas cambios."
            {...form.field('password')}
          />
          {form.formError ? <Alert tone="danger">{form.formError}</Alert> : null}
          <Button type="submit" loading={form.submitting} fullWidth>
            Guardar cambios
          </Button>
        </div>
      </form>
    </Surface>
  )
}

export function PerfilPage() {
  const { perfil, status, error, recargar, reemplazar } = usePerfil()

  return (
    <div className={styles.pagina}>
      <PageHeader overline="Tu cuenta" title="Mi perfil" description="Actualiza tu nombre, tu DPI y la foto que usas para el login facial." />
      <ResourceView
        status={status}
        error={error}
        onRetry={recargar}
        isEmpty={!perfil}
        skeleton={<Skeleton height={420} />}
        empty={null}
      >
        {perfil ? <FormularioPerfil key={perfil.id} perfil={perfil} onGuardado={reemplazar} /> : null}
      </ResourceView>
    </div>
  )
}
