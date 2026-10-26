import { useCallback, useEffect, useRef, useState } from 'react'
import { crearTicketSocket, urlSocket, type EventoChat } from './chat.api'

export type EstadoConexion = 'conectando' | 'conectado' | 'reconectando'

const ESPERAS_MS = [1000, 2000, 5000, 10000]

export function useChatSocket(token: string | null, onEvento: (evento: EventoChat) => void) {
  const [estado, setEstado] = useState<EstadoConexion>('conectando')
  const socket = useRef<WebSocket | null>(null)
  const manejador = useRef(onEvento)

  useEffect(() => {
    manejador.current = onEvento
  })

  useEffect(() => {
    if (!token) return
    let intento = 0
    let cerrado = false
    let reintento: ReturnType<typeof setTimeout>

    function programarReintento() {
      if (cerrado) return
      setEstado('reconectando')
      reintento = setTimeout(conectar, ESPERAS_MS[Math.min(intento++, ESPERAS_MS.length - 1)])
    }

    async function conectar() {
      let ticket: string
      try {
        ticket = await crearTicketSocket()
      } catch {
        programarReintento()
        return
      }
      if (cerrado) return
      const ws = new WebSocket(urlSocket(ticket))
      socket.current = ws
      ws.onopen = () => {
        intento = 0
        setEstado('conectado')
      }
      ws.onmessage = (evento) => {
        try {
          manejador.current(JSON.parse(evento.data) as EventoChat)
        } catch {}
      }
      ws.onclose = () => {
        programarReintento()
      }
    }

    conectar()
    return () => {
      cerrado = true
      clearTimeout(reintento)
      socket.current?.close()
    }
  }, [token])

  const enviar = useCallback((receptorId: number, texto: string) => {
    const ws = socket.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return false
    ws.send(JSON.stringify({ tipo: 'mensaje', receptorId, texto }))
    return true
  }, [])

  return { estado, enviar }
}
