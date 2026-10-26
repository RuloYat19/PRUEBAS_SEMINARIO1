import { useState } from 'react'
import { messageFor } from '@/shared/api'
import { formatRelative, useResource } from '@/shared/lib'
import { Badge, Button, CheckIcon, CloseIcon, IconButton, SearchIcon, Skeleton, Surface, TextField, UserPlusIcon, UsersIcon } from '@/shared/ui/atoms'
import { useToast } from '@/shared/ui/feedback'
import { EmptyState, PageHeader, SegmentedControl, UserRow } from '@/shared/ui/molecules'
import { ResourceView } from '@/shared/ui/organisms'
import { enviarSolicitud, listarPersonas, listarSolicitudes, responderSolicitud, type Solicitud, type Solicitudes, type UsuarioResumen } from './amistades.api'
import styles from './Amistades.module.css'

type Pestana = 'personas' | 'solicitudes'

const SIN_SOLICITUDES: Solicitudes = { recibidas: [], enviadas: [] }

function ListaSkeleton() {
  return (
    <div className={styles.lista}>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} height={68} />
      ))}
    </div>
  )
}

export function AmistadesPage() {
  const notify = useToast()
  const personas = useResource(listarPersonas, [] as UsuarioResumen[])
  const solicitudes = useResource(listarSolicitudes, SIN_SOLICITUDES)
  const [pestana, setPestana] = useState<Pestana>('personas')
  const [buscar, setBuscar] = useState('')
  const [ocupados, setOcupados] = useState<Set<number>>(new Set())

  async function conOcupado(id: number, accion: () => Promise<void>, error: string) {
    setOcupados((actual) => new Set(actual).add(id))
    try {
      await accion()
    } catch (e) {
      notify({ tone: 'danger', title: error, message: messageFor(e) })
    } finally {
      setOcupados((actual) => {
        const siguiente = new Set(actual)
        siguiente.delete(id)
        return siguiente
      })
    }
  }

  const agregar = (persona: UsuarioResumen) =>
    conOcupado(
      persona.id,
      async () => {
        const solicitud = await enviarSolicitud(persona.id)
        personas.setData((lista) => lista.filter((p) => p.id !== persona.id))
        solicitudes.setData((actual) => ({ ...actual, enviadas: [solicitud, ...actual.enviadas] }))
        notify({ title: 'Solicitud enviada', message: `Le avisamos a ${persona.nombreCompleto}.` })
      },
      'No se pudo enviar la solicitud',
    )

  const responder = (solicitud: Solicitud, estado: 'ACEPTADA' | 'RECHAZADA') =>
    conOcupado(
      solicitud.id,
      async () => {
        await responderSolicitud(solicitud.id, estado)
        solicitudes.setData((actual) => ({ ...actual, recibidas: actual.recibidas.filter((s) => s.id !== solicitud.id) }))
        notify(
          estado === 'ACEPTADA'
            ? { title: 'Ahora son amigos', message: `Ya puedes chatear con ${solicitud.usuario.nombreCompleto}.` }
            : { tone: 'neutral', title: 'Solicitud rechazada' },
        )
      },
      'No se pudo responder la solicitud',
    )

  const filtro = buscar.trim().toLowerCase()
  const visibles = filtro ? personas.data.filter((p) => p.nombreCompleto.toLowerCase().includes(filtro)) : personas.data
  const { recibidas, enviadas } = solicitudes.data

  return (
    <div className={styles.pagina}>
      <PageHeader overline="Comunidad" title="Personas" description="Envía solicitudes de amistad y responde las que recibes." />

      <SegmentedControl<Pestana>
        label="Sección"
        value={pestana}
        onChange={setPestana}
        options={[
          { value: 'personas', label: 'Personas', icon: <UserPlusIcon size={15} /> },
          { value: 'solicitudes', label: 'Solicitudes', icon: <UsersIcon size={15} />, count: recibidas.length },
        ]}
      />

      {pestana === 'personas' ? (
        <section className={styles.seccion}>
          <TextField label="Buscar personas" icon={<SearchIcon />} placeholder="Nombre" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
          <ResourceView
            status={personas.status}
            error={personas.error}
            onRetry={personas.reload}
            isEmpty={visibles.length === 0}
            skeleton={<ListaSkeleton />}
            empty={
              <EmptyState
                icon={<UsersIcon size={24} />}
                title={filtro ? 'Nadie con ese nombre' : 'Ya conoces a todos'}
                description={filtro ? 'Prueba con otro nombre.' : 'No hay más personas a quienes enviar solicitud.'}
              />
            }
          >
            <ul className={styles.lista}>
              {visibles.map((persona) => (
                <Surface as="li" key={persona.id} className={styles.item}>
                  <UserRow
                    nombre={persona.nombreCompleto}
                    fotoUrl={persona.fotoPerfilUrl}
                    acciones={
                      <Button size="sm" icon={<UserPlusIcon size={15} />} loading={ocupados.has(persona.id)} onClick={() => agregar(persona)}>
                        Agregar
                      </Button>
                    }
                  />
                </Surface>
              ))}
            </ul>
          </ResourceView>
        </section>
      ) : (
        <ResourceView
          status={solicitudes.status}
          error={solicitudes.error}
          onRetry={solicitudes.reload}
          isEmpty={recibidas.length === 0 && enviadas.length === 0}
          skeleton={<ListaSkeleton />}
          empty={<EmptyState icon={<UsersIcon size={24} />} title="Sin solicitudes pendientes" description="Cuando alguien quiera ser tu amigo, aparecerá aquí." />}
        >
          <section className={styles.seccion}>
            <h2 className="tf-overline">Recibidas</h2>
            {recibidas.length === 0 ? (
              <p className={styles.vacio}>No tienes solicitudes por responder.</p>
            ) : (
              <ul className={styles.lista}>
                {recibidas.map((solicitud) => (
                  <Surface as="li" key={solicitud.id} className={styles.item}>
                    <UserRow
                      nombre={solicitud.usuario.nombreCompleto}
                      fotoUrl={solicitud.usuario.fotoPerfilUrl}
                      detalle={formatRelative(solicitud.fechaSolicitud)}
                      acciones={
                        <>
                          <IconButton
                            icon={<CloseIcon size={16} />}
                            label={`Rechazar a ${solicitud.usuario.nombreCompleto}`}
                            variant="secondary"
                            disabled={ocupados.has(solicitud.id)}
                            onClick={() => responder(solicitud, 'RECHAZADA')}
                          />
                          <IconButton
                            icon={<CheckIcon size={16} />}
                            label={`Aceptar a ${solicitud.usuario.nombreCompleto}`}
                            variant="primary"
                            disabled={ocupados.has(solicitud.id)}
                            onClick={() => responder(solicitud, 'ACEPTADA')}
                          />
                        </>
                      }
                    />
                  </Surface>
                ))}
              </ul>
            )}
          </section>

          {enviadas.length > 0 ? (
            <section className={styles.seccion}>
              <h2 className="tf-overline">Enviadas</h2>
              <ul className={styles.lista}>
                {enviadas.map((solicitud) => (
                  <Surface as="li" key={solicitud.id} className={styles.item}>
                    <UserRow
                      nombre={solicitud.usuario.nombreCompleto}
                      fotoUrl={solicitud.usuario.fotoPerfilUrl}
                      detalle={formatRelative(solicitud.fechaSolicitud)}
                      acciones={<Badge tone="warning">Pendiente</Badge>}
                    />
                  </Surface>
                ))}
              </ul>
            </section>
          ) : null}
        </ResourceView>
      )}
    </div>
  )
}
