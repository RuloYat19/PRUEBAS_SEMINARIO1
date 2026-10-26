import { useCallback, useState } from 'react'
import { messageFor } from '@/shared/api'
import { formatDateTime, formatRelative, useResource } from '@/shared/lib'
import { Avatar, Button, MessageIcon, Skeleton } from '@/shared/ui/atoms'
import { Alert, Composer } from '@/shared/ui/molecules'
import { ResourceView } from '@/shared/ui/organisms'
import { Traductor } from '@/traduccion'
import { crearComentario, listarComentarios, type Comentario } from './comentarios.api'
import styles from './Comentarios.module.css'

const MAX_CARACTERES = 1000

function ComentarioItem({ comentario }: { comentario: Comentario }) {
  const { autor, texto, fechaComentario } = comentario
  return (
    <li className={styles.item}>
      <Avatar name={autor.nombreCompleto} src={autor.fotoPerfilUrl} size={32} />
      <div className={styles.cuerpo}>
        <p className={styles.cabecera}>
          <strong>{autor.nombreCompleto}</strong>
          <time dateTime={fechaComentario} title={formatDateTime(fechaComentario)} className="tf-mono">
            {formatRelative(fechaComentario)}
          </time>
        </p>
        <p className={styles.texto}>{texto}</p>
        <Traductor texto={texto} etiqueta="comentario" />
      </div>
    </li>
  )
}

function ListaComentarios({ publicacionId }: { publicacionId: number }) {
  const cargar = useCallback(() => listarComentarios(publicacionId), [publicacionId])
  const { data: comentarios, setData, status, error, reload } = useResource(cargar, [] as Comentario[])
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)

  async function comentar(texto: string) {
    setErrorEnvio(null)
    try {
      const nuevo = await crearComentario(publicacionId, texto)
      setData((lista) => [...lista, nuevo])
    } catch (e) {
      setErrorEnvio(messageFor(e, 'No se pudo publicar el comentario.'))
      throw e
    }
  }

  return (
    <div className={styles.panel}>
      <ResourceView
        status={status}
        error={error}
        onRetry={reload}
        isEmpty={comentarios.length === 0}
        skeleton={<Skeleton height={44} />}
        empty={<p className={styles.vacio}>Todavía no hay comentarios. Escribe el primero.</p>}
      >
        <ul className={styles.lista}>
          {comentarios.map((comentario) => (
            <ComentarioItem key={comentario.id} comentario={comentario} />
          ))}
        </ul>
      </ResourceView>

      <Composer
        id={`comentario-${publicacionId}`}
        label="Escribe un comentario"
        placeholder="Escribe un comentario…"
        maxLength={MAX_CARACTERES}
        onSend={comentar}
      />
      {errorEnvio ? <Alert tone="danger">{errorEnvio}</Alert> : null}
    </div>
  )
}

export function Comentarios({ publicacionId }: { publicacionId: number }) {
  const [abierto, setAbierto] = useState(false)

  return (
    <section className={styles.comentarios} aria-label="Comentarios">
      <Button
        variant="ghost"
        size="sm"
        icon={<MessageIcon size={16} />}
        aria-expanded={abierto}
        onClick={() => setAbierto((valor) => !valor)}
      >
        {abierto ? 'Ocultar comentarios' : 'Comentarios'}
      </Button>
      {abierto ? <ListaComentarios publicacionId={publicacionId} /> : null}
    </section>
  )
}
