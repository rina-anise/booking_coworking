import { useState } from 'react'
import { DateTime } from 'luxon'
import { useCreateBooking, isConflictError } from './hooks'
import { buildTimeRange, getBookingRangeError, MAX_DAYS_AHEAD } from '../../shared/lib/time'
import type { Room, Office } from '../../api/types'

interface Props {
  room: Room
  office: Office
  initialDate: string
  initialStartTime: string
  onClose: () => void
  onSuccess: () => void
}

const DURATION_OPTIONS = [15, 30, 60, 90, 120]

export function BookingModal({ room, office, initialDate, initialStartTime, onClose, onSuccess }: Props) {
  const [title, setTitle] = useState('')
  const [comment, setComment] = useState('')
  const [date, setDate] = useState(initialDate)
  const [startTime, setStartTime] = useState(initialStartTime)
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [conflict, setConflict] = useState(false)

  const mutation = useCreateBooking()

  const range = buildTimeRange(
    date,
    startTime,
    durationMinutes,
    office.timezone,
  )
  
  const startDateTime = DateTime.fromISO(`${date}T${startTime}`, {
    zone: office.timezone,
  })
  
  const endDateTime = startDateTime.plus({
    minutes: durationMinutes,
  })
  
  const validationError = getBookingRangeError(
    startDateTime,
    endDateTime,
  )

  const today = DateTime.now().setZone(office.timezone)
  const minDate = today.toFormat('yyyy-MM-dd')
  const maxDate = today.plus({ days: MAX_DAYS_AHEAD }).toFormat('yyyy-MM-dd')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setConflict(false)
    if (!range || !title.trim() || validationError) return

    mutation.mutate(
      {
        roomId: room.id,
        title: title.trim(),
        comment: comment.trim() || null,
        startsAt: range.startsAt,
        endsAt: range.endsAt,
      },
      {
        onSuccess: () => onSuccess(),
        onError: (error) => {
          if (isConflictError(error)) {
            setConflict(true)
          }
        },
      },
    )
  }

  if (conflict) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/40">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center">
          <h2 className="text-lg font-semibold text-gray-900">Время уже занято</h2>
          <p className="mt-2 text-sm text-gray-500">
            Выбранный интервал был забронирован другим сотрудником. Расписание обновлено.
          </p>
          <button
            onClick={() => setConflict(false)}
            className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white"
          >
            Выбрать другое время
          </button>
        </div>
      </div>
    )
  }

  const summary =
    range &&
    `Бронирование на ${DateTime.fromISO(range.startsAt, { zone: 'utc' })
      .setZone(office.timezone)
      .toFormat('cccc, d LLLL, HH:mm')} - ${DateTime.fromISO(range.endsAt, {
      zone: 'utc',
    })
      .setZone(office.timezone)
      .toFormat('HH:mm')}`

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Новое бронирование</h2>
        <p className="mt-1 text-sm text-gray-500">
          Переговорная: <span className="text-emerald-700">{room.name}</span>
        </p>

        <label className="mt-4 block text-sm text-gray-600">
          Тема встречи *
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-sm text-gray-600">
            Дата
            <input
              type="date"
              value={date}
              min={minDate}
              max={maxDate}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="text-sm text-gray-600">
            Время начала
            <input
              type="time"
              step={900}
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
        </div>

        <label className="mt-3 block text-sm text-gray-600">
          Продолжительность
          <select
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            {DURATION_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m} минут
              </option>
            ))}
          </select>
        </label>

        <label className="mt-3 block text-sm text-gray-600">
          Комментарий
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            rows={3}
          />
        </label>

        {summary && !validationError && (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {summary}
          </p>
        )}

        {validationError && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
            {validationError}
          </p>
        )}

        {mutation.isError && !isConflictError(mutation.error) && (
          <p className="mt-3 text-sm text-red-600">{mutation.error.message}</p>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">
            Отмена
          </button>
          <button
            type="submit"
            disabled={mutation.isPending || !range || Boolean(validationError) || !title.trim()}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {mutation.isPending ? 'Бронируем…' : 'Забронировать'}
          </button>
        </div>
      </form>
    </div>
  )
}