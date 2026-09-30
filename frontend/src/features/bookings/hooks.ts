import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getMyBookings, cancelBooking } from '../../api/client'
import type { GetMyBookingsParams } from '../../api/types'

export function useMyBookings(params: GetMyBookingsParams) {
  return useQuery({
    queryKey: ['my-bookings', params],
    queryFn: () => getMyBookings(params),
  })
}

export function useCancelBooking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (bookingId: string) => cancelBooking(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['room-schedule'] })
    },
  })
}