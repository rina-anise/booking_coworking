import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { WsEvent } from '../../api/types'

const WS_URL = import.meta.env.VITE_WS_URL as string
const RECONNECT_DELAY = 2000

export function useRealtimeSync() {
  const queryClient = useQueryClient()

  useEffect(() => {
    let socket: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let stopped = false

    const handleEvent = (event: WsEvent) => {
      switch (event.type) {
        case 'booking.created':
        case 'booking.cancelled': {
          queryClient.invalidateQueries({
            queryKey: ['room-schedule', event.data.booking.roomId],
          })

          queryClient.invalidateQueries({
            queryKey: ['rooms'],
          })

          queryClient.invalidateQueries({
            queryKey: ['my-bookings'],
          })

          break
        }

        case 'room.availability_changed':
          queryClient.invalidateQueries({
            queryKey: ['rooms'],
          })

          queryClient.invalidateQueries({
            queryKey: ['room-schedule', event.data.roomId],
          })

          break

        case 'data.reset':
          queryClient.invalidateQueries()
          break
      }
    }

    const connect = () => {
      if (stopped) return

      socket = new WebSocket(WS_URL)

      socket.onmessage = (message) => {
        try {
          const event = JSON.parse(message.data) as WsEvent
          handleEvent(event)
        } catch {
          // Ignore invalid WebSocket messages
        }
      }

      socket.onclose = () => {
        if (stopped) return

        reconnectTimer = setTimeout(connect, RECONNECT_DELAY)
      }

      socket.onerror = () => {
        socket?.close()
      }
    }

    connect()

    return () => {
      stopped = true

      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
      }

      socket?.close()
    }
  }, [queryClient])
}