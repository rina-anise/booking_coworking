import { DateTime } from 'luxon'
import { MAX_DAYS_AHEAD } from '../../shared/lib/time'
import type { Office } from '../../api/types'

export type FiltersValue = {
  date: string
  startTime: string
  durationMinutes: number
  minCapacity: number | null
}

const DURATION_OPTIONS = [
  { value: 15, label: '15 минут' }, 
  { value: 30, label: '30 минут' },
  { value: 60, label: '1 час' },
  { value: 90, label: '1.5 часа' },
  { value: 120, label: '2 часа' },
]

type Props = {
  office: Office
  value: FiltersValue
  onChange: (value: FiltersValue) => void
}

export function RoomFilters({ office, value, onChange }: Props) {
  const today = DateTime.now().setZone(office.timezone)
  const minDate = today.toFormat('yyyy-MM-dd')
  const maxDate = today.plus({ days: MAX_DAYS_AHEAD }).toFormat('yyyy-MM-dd')

  return (
    <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
      <label className="flex flex-col gap-1 text-sm text-gray-500">
        Дата
        <input
          type="date"
          min={minDate}
          max={maxDate}
          className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
          value={value.date}
          onChange={(e) => onChange({ ...value, date: e.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-gray-500">
        Время начала
        <input
          type="time"
          step={900}
          className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
          value={value.startTime}
          onChange={(e) => onChange({ ...value, startTime: e.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-gray-500">
        Длительность
        <select
          className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
          value={value.durationMinutes}
          onChange={(e) => onChange({ ...value, durationMinutes: Number(e.target.value) })}
        >
          {DURATION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-gray-500">
        Вместимость
        <input
          type="number"
          min={1}
          placeholder="Мин. чел."
          className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
          value={value.minCapacity ?? ''}
          onChange={(e) =>
            onChange({
              ...value,
              minCapacity: e.target.value ? Number(e.target.value) : null,
            })
          }
        />
      </label>

      <p className="col-span-full text-xs text-gray-400">
        Местное время в офисе «{office.name}» сейчас
      </p>
    </div>
  )
}