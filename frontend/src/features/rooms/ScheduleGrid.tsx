import { DateTime } from 'luxon'
import type { BookingView } from '../../api/types'
import { OFFICE_OPEN_HOUR, OFFICE_CLOSE_HOUR } from '../../shared/lib/time'

interface Props {
  date: string // 'yyyy-MM-dd'
  bookings: BookingView[]
  timezone: string
  currentUserId: string
}

const HOUR_HEIGHT_PX = 56
const TOTAL_HOURS = OFFICE_CLOSE_HOUR - OFFICE_OPEN_HOUR // 11 часов, 09:00–20:00

function hoursRange(): number[] {
  return Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => OFFICE_OPEN_HOUR + i)
}

function getBookingPosition(booking: BookingView, timezone: string) {
  const start = DateTime.fromISO(booking.startsAt, { zone: 'utc' }).setZone(timezone)
  const end = DateTime.fromISO(booking.endsAt, { zone: 'utc' }).setZone(timezone)

  const startMinutesFromOpen = (start.hour - OFFICE_OPEN_HOUR) * 60 + start.minute
  const durationMinutes = end.diff(start, 'minutes').minutes

  const top = Math.max(0, (startMinutesFromOpen / 60) * HOUR_HEIGHT_PX)
  const height = Math.max(4, (durationMinutes / 60) * HOUR_HEIGHT_PX)

  return { top, height }
}

export function ScheduleGrid({ bookings, timezone, currentUserId }: Props) {
  const hours = hoursRange()

  return (
    <div className="relative">
      <div>
        {hours.map((hour) => (
          <div key={hour} className="flex" style={{ height: HOUR_HEIGHT_PX }}>
            <div className="w-14 shrink-0 -translate-y-2.5 text-sm text-gray-400">
              {String(hour).padStart(2, '0')}:00
            </div>
            <div className="flex-1 border-t border-gray-200" />
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute left-14 right-0 top-0">
        {bookings.map((booking) => {
          const { top, height } = getBookingPosition(booking, timezone)
          const isMine = booking.userId === currentUserId

          return (
            <div
              key={booking.id}
              className={`pointer-events-auto absolute left-0 right-2 rounded-lg border px-3 py-1 text-sm ${
                isMine
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  : 'border-gray-200 bg-gray-100 text-gray-600'
              }`}
              style={{ top, height }}
            >
              {isMine ? `${booking.title} / ${booking.owner.displayName}` : 'Занято'}
            </div>
          )
        })}
      </div>
    </div>
  )
}