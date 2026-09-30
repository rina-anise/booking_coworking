import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getOffices, getRoom, getRoomBookings, getRooms, createBooking } from '../../api/client'
import { ApiError } from '../../api/client'
import type { CreateBookingPayload, GetRoomsParams } from '../../api/types'

export function useOffices() {
  return useQuery({
    queryKey: ['offices'],
    queryFn: getOffices,
    staleTime: Infinity,
  })
}

export function useRooms(params: GetRoomsParams | null) {
  return useQuery({
    queryKey: ['rooms', params],
    queryFn: () => getRooms(params as GetRoomsParams),
    enabled: params !== null,
  })
}

export function useRoom(roomId: string) {
  return useQuery({
    queryKey: ['room', roomId],
    queryFn: () => getRoom(roomId),
  })
}

export function useRoomSchedule(roomId: string, from: string, to: string) {
  return useQuery({
    queryKey: ['room-schedule', roomId, from, to],
    queryFn: () => getRoomBookings(roomId, from, to),
    enabled: Boolean(from && to),
  })
}

export function useCreateBooking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateBookingPayload) => createBooking(payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['room-schedule', variables.roomId] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] })
    },
  })
}

export function isConflictError(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'BOOKING_CONFLICT'
}