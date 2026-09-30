import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { DateTime } from 'luxon'
import { useOffices, useRooms } from './hooks'
import { RoomFilters, type FiltersValue } from './RoomFilters'
import { LoadingState, ErrorState, EmptyState } from '../../shared/ui/QueryState'
import { buildTimeRange } from '../../shared/lib/time'
import type { RoomSummary } from '../../api/types'

function defaultFilters(): FiltersValue {
  const now = DateTime.now()
  return {
    date: now.toFormat('yyyy-MM-dd'),
    startTime: now.plus({ minutes: 15 }).toFormat('HH:mm'),
    durationMinutes: 60,
    minCapacity: null,
  }
}

export function RoomsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const officesQuery = useOffices()
  const offices = officesQuery.data?.items ?? []

  const officeId = searchParams.get('officeId') ?? offices[0]?.id ?? ''
  const office = offices.find((o) => o.id === officeId)

  const filters: FiltersValue = {
    date: searchParams.get('date') ?? defaultFilters().date,
    startTime: searchParams.get('startTime') ?? defaultFilters().startTime,
    durationMinutes: Number(searchParams.get('duration') ?? 60),
    minCapacity: searchParams.get('minCapacity')
      ? Number(searchParams.get('minCapacity'))
      : null,
  }

  function updateFilters(next: FiltersValue) {
    const params = new URLSearchParams(searchParams)
    params.set('date', next.date)
    params.set('startTime', next.startTime)
    params.set('duration', String(next.durationMinutes))
    if (next.minCapacity) {
      params.set('minCapacity', String(next.minCapacity))
    } else {
      params.delete('minCapacity')
    }
    setSearchParams(params, { replace: true })
  }

  function handleOfficeChange(nextOfficeId: string) {
    const params = new URLSearchParams(searchParams)
    params.set('officeId', nextOfficeId)
    setSearchParams(params, { replace: true })
  }

  const range = office
    ? buildTimeRange(filters.date, filters.startTime, filters.durationMinutes, office.timezone)
    : null

  const roomsParams = useMemo(() => {
  if (!office) return null
    
    return {
      officeId: office.id,
      minCapacity: filters.minCapacity ?? undefined,
      from: range?.startsAt,
      to: range?.endsAt,
    }
}, [office, filters.minCapacity, range?.startsAt, range?.endsAt])

  const roomsQuery = useRooms(roomsParams)

  if (officesQuery.isLoading) {
    return <LoadingState label="Загружаем офисы…" />
  }

  if (officesQuery.isError) {
    return (
      <ErrorState message="Не удалось загрузить список офисов" onRetry={() => officesQuery.refetch()} />
    )
  }

  if (offices.length === 0) {
    return <EmptyState>Офисов пока нет.</EmptyState>
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Переговорные</h1>
        <select
          value={officeId}
          onChange={(e) => handleOfficeChange(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
        >
          {offices.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>

      {office && <RoomFilters office={office} value={filters} onChange={updateFilters} />}

      {roomsQuery.isLoading && <LoadingState label="Загружаем переговорные…" />}

      {roomsQuery.isError && (
        <ErrorState message="Не удалось загрузить переговорные" onRetry={() => roomsQuery.refetch()} />
      )}

      {roomsQuery.data && roomsQuery.data.items.length === 0 && (
        <EmptyState>Переговорные не найдены — попробуйте изменить фильтры.</EmptyState>
      )}

      {roomsQuery.data && roomsQuery.data.items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roomsQuery.data.items.map((room) => (
            <RoomCard key={room.id} room={room} onClick={() => navigate(`/rooms/${room.id}`)} />
          ))}
        </div>
      )}
    </div>
  )
}

function RoomCard({ room, onClick }: { room: RoomSummary; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-emerald-300 hover:shadow-sm"
    >
      <div className="flex items-start justify-between">
        <h3 className="font-medium text-gray-900">{room.name}</h3>
        {room.available !== undefined && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              room.available ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {room.available ? 'Свободна' : 'Занята'}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-gray-500">
        Этаж {room.floor} · до {room.capacity} человек
      </p>
      {room.features.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1">
          {room.features.map((f) => (
            <li key={f.code} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {f.name}
            </li>
          ))}
        </ul>
      )}
    </button>
  )
}