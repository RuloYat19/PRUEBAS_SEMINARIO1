import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ROUTES } from '@/app/paths'
import { useSession } from '@/app/session'
import { listarAmigos, type UsuarioResumen } from '@/amistades'
import { usePerfil } from '@/perfil'
import { messageFor } from '@/shared/api'
import { cx, formatTime, useResource } from '@/shared/lib'
import { ArrowLeftIcon, Badge, ButtonLink, MessageIcon, Skeleton, Spinner } from '@/shared/ui/atoms'
import { useToast } from '@/shared/ui/feedback'
import { Alert, Composer, EmptyState, MessageBubble, UserRow } from '@/shared/ui/molecules'
import { ResourceView } from '@/shared/ui/organisms'
import { listarMensajes, type EventoChat, type Mensaje } from './chat.api'
import { useChatSocket, type EstadoConexion } from './useChatSocket'
import styles from './Chat.module.css'

const MAX_CARACTERES = 2000

type Historial = { estado: 'cargando' } | { estado: 'error'; error: string } | { estado: 'listo'; mensajes: Mensaje[] }

interface ConversacionProps {
  amigo: UsuarioResumen
  yo: number
  historial: Historial | undefined
  conexion: EstadoConexion
  onReintentar: () => void
  onEnviar: (texto: string) => void
}

function Conversacion({ amigo, yo, historial, conexion, onReintentar, onEnviar }: ConversacionProps) {
  const final = useRef<HTMLDivElement>(null)
  const mensajes = historial?.estado === 'listo' ? historial.mensajes : []

  useEffect(() => {
    final.current?.scrollIntoView({ block: 'end' })
  }, [mensajes.length])

  return (
    <section className={styles.conversacion} aria-label={`Conversación con ${amigo.nombreCompleto}`}>
      <header className={styles.cabecera}>
        <Link to={ROUTES.chat} className={styles.volver} aria-label="Volver a la lista de amigos">
          <ArrowLeftIcon />
        </Link>
        <UserRow
          nombre={amigo.nombreCompleto}
          fotoUrl={amigo.fotoPerfilUrl}
          detalle={conexion === 'conectado' ? 'En línea por WebSocket' : 'Reconectando…'}
        />
      </header>

      <div className={styles.mensajes} aria-live="polite">
        {!historial || historial.estado === 'cargando' ? (
          <Spinner size={22} label="Cargando mensajes" />
        ) : historial.estado === 'error' ? (
          <Alert tone="danger" title="No se pudieron cargar los mensajes">
            {historial.error}{' '}
            <button type="button" className={styles.reintentar} onClick={onReintentar}>
              Reintentar
            </button>
          </Alert>
        ) : mensajes.length === 0 ? (
          <p className={styles.vacio}>Escríbele a {amigo.nombreCompleto.split(' ')[0]} para empezar la conversación.</p>
        ) : (
          mensajes.map((mensaje) => (
            <MessageBubble key={mensaje.id} propio={mensaje.emisorId === yo} meta={formatTime(mensaje.fechaEnvio)}>
              {mensaje.texto}
            </MessageBubble>
          ))
        )}
        <div ref={final} />
      </div>

      <div className={styles.pie}>
        <Composer
          id={`chat-${amigo.id}`}
          label={`Mensaje para ${amigo.nombreCompleto}`}
          placeholder={conexion === 'conectado' ? 'Escribe un mensaje…' : 'Reconectando…'}
          maxLength={MAX_CARACTERES}
          disabled={conexion !== 'conectado'}
          onSend={onEnviar}
        />
      </div>
    </section>
  )
}

export function ChatPage() {
  const { amigoId } = useParams()
  const activo = Number(amigoId) || null
  const navigate = useNavigate()
  const notify = useToast()
  const { token } = useSession()
  const { perfil } = usePerfil()
  const yo = perfil?.id ?? 0
  const amigos = useResource(listarAmigos, [] as UsuarioResumen[])
  const [historiales, setHistoriales] = useState<Record<number, Historial>>({})
  const [noLeidos, setNoLeidos] = useState<Record<number, number>>({})

  const cargarHistorial = useCallback((id: number) => {
    setHistoriales((h) => ({ ...h, [id]: { estado: 'cargando' } }))
    listarMensajes(id)
      .then((mensajes) => setHistoriales((h) => ({ ...h, [id]: { estado: 'listo', mensajes } })))
      .catch((e) => setHistoriales((h) => ({ ...h, [id]: { estado: 'error', error: messageFor(e) } })))
  }, [])

  useEffect(() => {
    if (!activo) return
    setNoLeidos((n) => ({ ...n, [activo]: 0 }))
    if (!historiales[activo]) cargarHistorial(activo)
  }, [activo, historiales, cargarHistorial])

  const { estado, enviar } = useChatSocket(token, (evento: EventoChat) => {
    if (evento.tipo === 'error') return notify({ tone: 'danger', title: 'No se envió el mensaje', message: evento.error })
    if (evento.tipo === 'keepalive') return
    const { mensaje } = evento
    const otro = mensaje.emisorId === yo ? mensaje.receptorId : mensaje.emisorId
    setHistoriales((h) => {
      const actual = h[otro]
      if (actual?.estado !== 'listo' || actual.mensajes.some((m) => m.id === mensaje.id)) return h
      return { ...h, [otro]: { estado: 'listo', mensajes: [...actual.mensajes, mensaje] } }
    })
    if (otro !== activo && mensaje.emisorId !== yo) setNoLeidos((n) => ({ ...n, [otro]: (n[otro] ?? 0) + 1 }))
  })

  function enviarA(amigo: UsuarioResumen) {
    return (texto: string) => {
      if (!enviar(amigo.id, texto)) throw new Error('Sin conexión')
    }
  }

  const amigo = amigos.data.find((a) => a.id === activo)

  return (
    <div className={cx(styles.chat, activo !== null && styles.conActivo)}>
      <aside className={styles.amigos} aria-label="Amigos">
        <h1 className={cx('tf-h2', styles.titulo)}>Chat</h1>
        <ResourceView
          status={amigos.status}
          error={amigos.error}
          onRetry={amigos.reload}
          isEmpty={amigos.data.length === 0}
          skeleton={<Skeleton height={60} />}
          empty={
            <EmptyState
              icon={<MessageIcon size={24} />}
              title="Aún no tienes amigos"
              description="Cuando alguien acepte tu solicitud, podrás chatear aquí."
              action={<ButtonLink to={ROUTES.amigos}>Buscar personas</ButtonLink>}
            />
          }
        >
          <ul className={styles.lista}>
            {amigos.data.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  className={styles.amigo}
                  aria-current={a.id === activo || undefined}
                  onClick={() => navigate(`${ROUTES.chat}/${a.id}`)}
                >
                  <UserRow
                    nombre={a.nombreCompleto}
                    fotoUrl={a.fotoPerfilUrl}
                    acciones={noLeidos[a.id] ? <Badge tone="accent">{noLeidos[a.id]}</Badge> : null}
                  />
                </button>
              </li>
            ))}
          </ul>
        </ResourceView>
      </aside>

      {amigo ? (
        <Conversacion
          key={amigo.id}
          amigo={amigo}
          yo={yo}
          historial={historiales[amigo.id]}
          conexion={estado}
          onReintentar={() => cargarHistorial(amigo.id)}
          onEnviar={enviarA(amigo)}
        />
      ) : (
        <div className={styles.sinSeleccion}>
          {activo && amigos.status === 'ready' ? (
            <Alert tone="warning">Esa persona no está en tu lista de amigos.</Alert>
          ) : (
            <EmptyState icon={<MessageIcon size={24} />} tone="sky" title="Elige una conversación" description="Tus amigos aparecen a la izquierda." />
          )}
        </div>
      )}
    </div>
  )
}
