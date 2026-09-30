import type {
  Office,
  RoomSummary,
  BookingView,
  GetRoomsParams,
  GetMyBookingsParams,
  CreateBookingPayload,
  User,
} from './types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string

export class ApiError extends Error {
  code: string
  status?: number
  details?: unknown

  constructor(code: string, message: string, status?: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = details
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'DELETE'
  body?: unknown
  searchParams?: Record<string, string | number | undefined>
}

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(BASE_URL + path)
  for (const [key, value] of Object.entries(options.searchParams ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value))
  }

  const res = await fetch(url, {
    method: options.method ?? 'GET',
    headers: options.body ? { 'content-type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as
      | { error?: { code?: string; message?: string; details?: unknown } }
      | null
    const err = payload?.error
    throw new ApiError(
      err?.code ?? 'UNKNOWN_ERROR',
      err?.message ?? 'Что-то пошло не так',
      res.status,
      err?.details,
    )
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export function getOffices(): Promise<{ items: Office[] }> {
  return apiRequest('/offices')
}

export function getRooms(params: GetRoomsParams): Promise<{ items: RoomSummary[] }> {
  return apiRequest('/rooms', { searchParams: params })
}

export function getRoom(roomId: string): Promise<RoomSummary> {
  return apiRequest(`/rooms/${roomId}`)
}

// from/to — ISO-строки с таймзоной, обязательны вместе (см. scheduleQuerySchema на бэке)
export function getRoomBookings(
  roomId: string,
  from: string,
  to: string,
): Promise<{ items: BookingView[] }> {
  return apiRequest(`/rooms/${roomId}/bookings`, { searchParams: { from, to } })
}

export function getMyBookings(params: GetMyBookingsParams = {}): Promise<{ items: BookingView[] }> {
  return apiRequest('/bookings', { searchParams: params })
}

export function createBooking(payload: CreateBookingPayload): Promise<BookingView> {
  return apiRequest('/bookings', { method: 'POST', body: payload })
}

export function cancelBooking(bookingId: string): Promise<void> {
  return apiRequest(`/bookings/${bookingId}`, { method: 'DELETE' })
}

export function getCurrentUser(): Promise<User> {
  return apiRequest('/me')
}