import { useState } from 'react'
import { DateTime } from 'luxon'
import { useMyBookings, useCancelBooking } from './hooks'
import { LoadingState, ErrorState, EmptyState } from '../../shared/ui/QueryState'
import type { BookingsScope, BookingView } from '../../api/types'

const TABS: { value: BookingsScope; label: string }[] = [
  { value: 'upcoming', label: 'Предстоящие' },
  { value: 'past', label: 'Прошедшие' },
  { value: 'all', label: 'Все' },
]

export function BookingsPage() {
  const [scope, setScope] = useState<BookingsScope>('upcoming')
  const bookingsQuery = useMyBookings({ scope })
  const cancelMutation = useCancelBooking()

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-gray-900">Мои бронирования</h1>

      <div className="mb-6 flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setScope(tab.value)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              scope === tab.value
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {bookingsQuery.isLoading && <LoadingState label="Загружаем бронирования…" />}

      {bookingsQuery.isError && (
        <ErrorState message="Не удалось загрузить бронирования" onRetry={() => bookingsQuery.refetch()} />
      )}

      {bookingsQuery.data && bookingsQuery.data.items.length === 0 && (
        <EmptyState>
          {scope === 'upcoming' ? 'Нет предстоящих бронирований.' : 'Бронирований не найдено.'}
        </EmptyState>
      )}

      {bookingsQuery.data && bookingsQuery.data.items.length > 0 && (
        <ul className="flex flex-col gap-3">
          {bookingsQuery.data.items.map((booking) => (
            <BookingRow
              key={booking.id}
              booking={booking}
              onCancel={() => cancelMutation.mutate(booking.id)}
              isCancelling={cancelMutation.isPending && cancelMutation.variables === booking.id}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function BookingRow({
  booking,
  onCancel,
  isCancelling,
}: {
  booking: BookingView
  onCancel: () => void
  isCancelling: boolean
}) {
  const starts = DateTime.fromISO(booking.startsAt).setZone(booking.office.timezone)
  const ends = DateTime.fromISO(booking.endsAt).setZone(booking.office.timezone)
  const isPast = ends < DateTime.now()

  return (
    <li className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4">
      <div>
        <p className="font-medium text-gray-900">{booking.title || booking.room.name}</p>
        <p className="text-sm text-gray-500">
          {booking.room.name}, {booking.office.name}
        </p>
        <p className="text-sm text-gray-500">
          {starts.toFormat('d MMMM, HH:mm')}–{ends.toFormat('HH:mm')}
        </p>
      </div>

      {!isPast && (
        <button
          onClick={() => {
            if (confirm('Отменить бронирование?')) onCancel()
          }}
          disabled={isCancelling}
          className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          {isCancelling ? 'Отменяем…' : 'Отменить'}
        </button>
      )}
    </li>
  )
}