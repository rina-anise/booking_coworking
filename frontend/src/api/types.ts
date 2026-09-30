export type Office = {
  id: string
  name: string
  address: string
  timezone: string
}

export type RoomFeature = {
  code: string
  name: string
}

export type Room = {
  id: string
  officeId: string
  name: string
  floor: number
  capacity: number
  features: RoomFeature[]
}

export type RoomSummary = Room & {
  office: Office
  available?: boolean
}

export type User = {
  id: string
  login: string
  displayName: string
  email: string
  avatarUrl: string | null
  initials: string
}

export type Booking = {
  id: string
  roomId: string
  userId: string
  title: string
  comment: string | null
  startsAt: string
  endsAt: string
  createdAt: string
}

export type BookingView = Booking & {
  room: Room
  office: Office
  owner: User
}

export type BookingsScope = 'upcoming' | 'past' | 'all'

export type GetRoomsParams = {
  officeId: string
  minCapacity?: number
  from?: string
  to?: string
}

export type GetMyBookingsParams = {
  scope?: BookingsScope
  officeId?: string
}

export type CreateBookingPayload = {
  roomId: string
  title: string
  comment?: string | null
  startsAt: string
  endsAt: string
}

export type RoomAvailabilityChangedData = {
  roomId: string
  officeId: string
  startsAt: string
  endsAt: string
  available: boolean
}

export type BookingCreatedData = {
  booking: BookingView
}

export type BookingCancelledData = {
  booking: BookingView
}

export type DataResetData = Record<string, never>

export type WsEvent =
  | { type: 'booking.created'; occurredAt: string; data: BookingCreatedData }
  | { type: 'booking.cancelled'; occurredAt: string; data: BookingCancelledData }
  | { type: 'room.availability_changed'; occurredAt: string; data: RoomAvailabilityChangedData }
  | { type: 'data.reset'; occurredAt: string; data: DataResetData }