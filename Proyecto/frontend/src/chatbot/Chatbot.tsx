import { useEffect, useRef, useState } from 'react'
import { messageFor } from '@/shared/api'
import { BotIcon, IconButton, Spinner } from '@/shared/ui/atoms'
import { Composer, MessageBubble } from '@/shared/ui/molecules'
import { Dialog, DialogBody, DialogFooter } from '@/shared/ui/organisms'
import { preguntar } from './chatbot.api'
import styles from './Chatbot.module.css'

interface Entrada {
  id: number
  deBot: boolean
  texto: string
}

const SUGERENCIAS = ['¿Cuál es el horario de la facultad?', '¿Cuándo son las inscripciones?', '¿Dónde queda control académico?']

const BIENVENIDA: Entrada = {
  id: 0,
  deBot: true,
  texto: 'Hola, soy el asistente de la Facultad de Ingeniería. Pregúntame por horarios, fechas o trámites.',
}

let siguienteId = 1

export function Chatbot() {
  const [abierto, setAbierto] = useState(false)
  const [entradas, setEntradas] = useState<Entrada[]>([BIENVENIDA])
  const [pensando, setPensando] = useState(false)
  const final = useRef<HTMLDivElement>(null)

  useEffect(() => {
    final.current?.scrollIntoView({ block: 'end' })
  }, [entradas.length, pensando, abierto])

  async function enviar(texto: string) {
    setEntradas((lista) => [...lista, { id: siguienteId++, deBot: false, texto }])
    setPensando(true)
    try {
      const respuestas = await preguntar(texto)
      setEntradas((lista) => [...lista, ...respuestas.map((r) => ({ id: siguienteId++, deBot: true, texto: r }))])
    } catch (error) {
      setEntradas((lista) => [...lista, { id: siguienteId++, deBot: true, texto: messageFor(error, 'No pude responder. Intenta de nuevo.') }])
    } finally {
      setPensando(false)
    }
  }

  return (
    <>
      <IconButton icon={<BotIcon />} label="Asistente de la facultad" onClick={() => setAbierto(true)} />

      <Dialog open={abierto} onClose={() => setAbierto(false)} title="Asistente de Ingeniería" description="Respuestas de Amazon Lex sobre la facultad.">
        <DialogBody>
          <div className={styles.conversacion} aria-live="polite">
            {entradas.map((entrada) => (
              <MessageBubble key={entrada.id} propio={!entrada.deBot}>
                {entrada.texto}
              </MessageBubble>
            ))}
            {pensando ? (
              <span className={styles.pensando}>
                <Spinner size={14} label="El asistente está escribiendo" /> Escribiendo…
              </span>
            ) : null}
            <div ref={final} />
          </div>
          {entradas.length === 1 ? (
            <div className={styles.sugerencias}>
              {SUGERENCIAS.map((sugerencia) => (
                <button key={sugerencia} type="button" className={styles.sugerencia} onClick={() => enviar(sugerencia)}>
                  {sugerencia}
                </button>
              ))}
            </div>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <div className={styles.pie}>
            <Composer id="chatbot" label="Pregunta para el asistente" placeholder="Escribe tu pregunta…" maxLength={1024} disabled={pensando} onSend={enviar} />
          </div>
        </DialogFooter>
      </Dialog>
    </>
  )
}
