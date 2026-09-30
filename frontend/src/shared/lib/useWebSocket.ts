// src/shared/lib/useWebSocket.ts
import { useEffect, useRef } from 'react'
import type { WsEvent } from '../../api/types'

const WS_URL = import.meta.env.VITE_WS_URL as string
const RECONNECT_DELAY_MS = 2000

export function useWebSocket(onEvent: (event: WsEvent) => void) {
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  useEffect(() => {
    let socket: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let stopped = false

    function connect() {
      socket = new WebSocket(WS_URL)

      socket.onmessage = (message) => {
        try {
          const parsed = JSON.parse(message.data as string) as WsEvent
          onEventRef.current(parsed)
        } catch {
          // Игнорируем сообщения, которые не удалось разобрать
        }
      }

      socket.onclose = () => {
        if (!stopped) {
          reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS)
        }
      }

      socket.onerror = () => {
        socket?.close()
      }
    }

    connect()

    return () => {
      stopped = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      socket?.close()
    }
  }, [])
}