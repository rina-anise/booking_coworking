import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { DateTime } from 'luxon'
import { useRoom, useRoomSchedule } from './hooks'
import { LoadingState, ErrorState } from '../../shared/ui/QueryState'
import { ScheduleGrid } from './ScheduleGrid'
import { BookingModal } from './BookingModal'
import { OFFICE_OPEN_HOUR, OFFICE_CLOSE_HOUR } from '../../shared/lib/time'
import { useCurrentUser } from '../user/hooks'

export function RoomDetailPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const [selectedDate, setSelectedDate] = useState(() => DateTime.now().toFormat('yyyy-MM-dd'))
  const [modalOpen, setModalOpen] = useState(false)

  const roomQuery = useRoom(roomId!)
  const room = roomQuery.data

  const { data: currentUser } = useCurrentUser()

  const dayRange = room
    ? {
        from: DateTime.fromFormat(selectedDate, 'yyyy-MM-dd', { zone: room.office.timezone })
          .set({ hour: OFFICE_OPEN_HOUR })
          .toISO()!,
        to: DateTime.fromFormat(selectedDate, 'yyyy-MM-dd', { zone: room.office.timezone })
          .set({ hour: OFFICE_CLOSE_HOUR })
          .toISO()!,
      }
    : null

  const scheduleQuery = useRoomSchedule(roomId!, dayRange?.from ?? '', dayRange?.to ?? '')

  if (roomQuery.isLoading) return <LoadingState label="Загружаем переговорную…" />
  if (roomQuery.isError || !room) {
    return (
      <ErrorState
        message="Не удалось загрузить переговорную"
        onRetry={() => roomQuery.refetch()}
      />
    )
  }

  return (
    <div>
      <nav className="mb-4 flex items-center gap-2 text-sm text-gray-500">
        <Link to="/rooms">Переговорные</Link>
        <span>›</span>
        <span>{room.office.name}</span>
        <span>›</span>
        <span className="text-gray-900">Комната «{room.name}»</span>
      </nav>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="h-fit rounded-xl border border-gray-200 bg-white p-5">
          <h1 className="text-xl font-semibold text-gray-900">{room.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {room.office.name} · {room.office.address}
          </p>

          <ul className="mt-4 space-y-2 text-sm text-gray-600">
            <li>Вместимость: до {room.capacity} человек</li>
            {room.features.map((f) => (
              <li key={f.code}>{f.name}</li>
            ))}
          </ul>
        </aside>

        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Расписание на день</h2>
              <p className="text-sm text-gray-500">
                {DateTime.fromFormat(selectedDate, 'yyyy-MM-dd').setLocale('ru').toFormat('cccc, d LLLL')}
              </p>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          {scheduleQuery.isLoading && <LoadingState label="Загружаем расписание…" />}
          {scheduleQuery.isError && (
            <ErrorState message="Не удалось загрузить расписание" onRetry={() => scheduleQuery.refetch()} />
          )}
          {scheduleQuery.data && currentUser && (
            <ScheduleGrid
              date={selectedDate}
              bookings={scheduleQuery.data.items}
              timezone={room.office.timezone}
              currentUserId={currentUser.id}
            />
          )}

          <div className="mt-5 flex justify-end">
            <button
              onClick={() => setModalOpen(true)}
              className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white"
            >
              Забронировать комнату
            </button>
          </div>
        </section>
      </div>

      {modalOpen && (
        <BookingModal
          room={room}
          office={room.office}
          initialDate={selectedDate}
          initialStartTime={DateTime.now().toFormat('HH:mm')}
          onClose={() => setModalOpen(false)}
          onSuccess={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}